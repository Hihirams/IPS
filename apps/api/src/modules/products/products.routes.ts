import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma';
import { CacheService } from '../../services/cache.service';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { requireMFA, requireAdminSession } from '../../middleware/admin-auth.middleware';
import {
  ProductQuerySchema,
  SearchQuerySchema,
  CreateProductSchema,
  UpdateProductSchema,
  UpdateStockSchema,
  CreateCategorySchema,
  CreateBrandSchema,
} from './products.schema';
import type {
  ProductQueryInput,
  SearchQueryInput,
  CreateProductInput,
  UpdateProductInput,
  UpdateStockInput,
  CreateCategoryInput,
  CreateBrandInput,
} from './products.schema';
import {
  generateSlug,
  generateCategorySlug,
  generateBrandSlug,
  sanitizeHtml,
  validateImageUrls,
  getStockStatus,
  validateSpecsSize,
  logAdminAction,
  toPublicProduct,
} from './products.helpers';
import type { PublicProduct, PublicProductDetail } from './products.helpers';

/**
 * Registra todas las rutas de productos.
 */
export async function productRoutes(app: FastifyInstance) {
  const cache = new CacheService(app);

  // ==========================================
  // Rutas Publicas
  // ==========================================

  // GET /api/products — Lista paginada con filtros
  app.get('/api/products', async (request, reply) => {
    const query = request.validate(ProductQuerySchema, 'query') as ProductQueryInput;

    // Cache key
    const cached = await cache.getProductList<{
      data: PublicProduct[];
      total: number;
      page: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }>(query);

    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    const skip = (query.page - 1) * query.limit;

    // Construir where dinamico
    const where: Record<string, unknown> = { isActive: true };

    if (query.category) {
      const cat = await prisma.category.findUnique({
        where: { slug: query.category },
        select: { id: true },
      });
      if (cat) {
        (where as Record<string, unknown>).categoryId = cat.id;
      }
    }

    if (query.brand) {
      const brand = await prisma.brand.findUnique({
        where: { slug: query.brand },
        select: { id: true },
      });
      if (brand) {
        (where as Record<string, unknown>).brandId = brand.id;
      }
    }

    if (query.minPrice !== undefined) {
      (where as Record<string, unknown>).price = {
        ...(where as Record<string, unknown>).price as object,
        gte: query.minPrice,
      };
    }

    if (query.maxPrice !== undefined) {
      (where as Record<string, unknown>).price = {
        ...(where as Record<string, unknown>).price as object,
        lte: query.maxPrice,
      };
    }

    if (query.inStock) {
      (where as Record<string, unknown>).stock = { gt: 0 };
    }

    if (query.search) {
      (where as Record<string, unknown>).OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Sorting
    const orderBy: Record<string, string> = {};
    orderBy[query.sortBy] = query.sortOrder;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    const response = {
      data: products.map(toPublicProduct),
      total,
      page: query.page,
      totalPages,
      hasNext: query.page < totalPages,
      hasPrev: query.page > 1,
    };

    await cache.setProductList(query, response);

    return reply.status(200).send({ success: true, data: response });
  });

  // GET /api/products/:slug — Detalle de producto
  app.get('/api/products/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const cached = await cache.getProductDetail<PublicProductDetail>(slug);
    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    const product = await prisma.product.findUnique({
      where: { slug, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true, logo: true } },
        reviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' },
      });
    }

    // Calcular review summary
    const reviewAgg = await prisma.review.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    const publicProduct = toPublicProduct(product) as PublicProductDetail;
    publicProduct.reviews = product.reviews;
    publicProduct.reviewSummary = {
      averageRating: Number(reviewAgg._avg.rating?.toFixed(1)) ?? 0,
      totalReviews: reviewAgg._count.id,
    };

    await cache.setProductDetail(slug, publicProduct);

    // Incrementar vistas de forma async (no bloquear respuesta)
    prisma.product.update({
      where: { id: product.id },
      data: {}, // En una implementacion real, tendriamos un campo views
    }).catch(() => { /* ignorar errores de vistas */ });

    return reply.status(200).send({ success: true, data: publicProduct });
  });

  // GET /api/products/search — Busqueda
  app.get('/api/products/search', async (request, reply) => {
    const query = request.validate(SearchQuerySchema, 'query') as SearchQueryInput;

    const cached = await cache.getSearch<PublicProduct[]>(query);
    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    // TODO: En produccion, migrar a Elasticsearch o Meilisearch
    // para busqueda full-text con ranking de relevancia.
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
          { sku: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      take: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true, logo: true } },
      },
    });

    const result = products.map(toPublicProduct);
    await cache.setSearch(query, result);

    return reply.status(200).send({ success: true, data: result });
  });

  // GET /api/categories — Lista de categorias activas
  app.get('/api/categories', async (_request, reply) => {
    const cached = await cache.getCategories<unknown[]>();
    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    await cache.setCategories(categories);

    return reply.status(200).send({ success: true, data: categories });
  });

  // GET /api/categories/:slug — Detalle de categoria
  app.get('/api/categories/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const cached = await cache.getCategoryDetail<unknown>(slug);
    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    const category = await prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        children: { where: { isActive: true }, select: { id: true, name: true, slug: true, image: true } },
        products: {
          where: { isActive: true },
          take: 12,
          orderBy: { createdAt: 'desc' },
          include: {
            brand: { select: { id: true, name: true, slug: true, logo: true } },
          },
        },
      },
    });

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Categoria no encontrada.' },
      });
    }

    await cache.setCategoryDetail(slug, category);

    return reply.status(200).send({ success: true, data: category });
  });

  // GET /api/brands — Lista de marcas activas
  app.get('/api/brands', async (_request, reply) => {
    const cached = await cache.getBrands<unknown[]>();
    if (cached) {
      return reply.status(200).send({ success: true, data: cached });
    }

    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });

    await cache.setBrands(brands);

    return reply.status(200).send({ success: true, data: brands });
  });

  // ==========================================
  // Rutas de Admin
  // ==========================================

  // GET /api/admin/products — Lista completa para panel admin
  app.get(
    '/api/admin/products',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string; search?: string };
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
      const skip = (page - 1) * limit;
      const where = query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true, logo: true } },
          },
        }),
        prisma.product.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: products,
        meta: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // GET /api/admin/products/:id — Detalle para edición admin
  app.get(
    '/api/admin/products/:id',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true, logo: true } },
        },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' },
        });
      }

      return reply.status(200).send({ success: true, data: product });
    }
  );

  // POST /api/admin/products — Crear producto
  app.post(
    '/api/admin/products',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const data = request.validate(CreateProductSchema, 'body') as CreateProductInput;

      // Sanitizar campos de texto
      const sanitizedName = sanitizeHtml(data.name);
      const sanitizedDescription = sanitizeHtml(data.description);

      // Generar slug si no se proporciono
      const slug = data.slug || (await generateSlug(sanitizedName));

      // Verificar SKU unico
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
        select: { id: true },
      });
      if (existingSku) {
        return reply.status(409).send({
          success: false,
          error: { code: 'SKU_EXISTS', message: 'El SKU ya existe.' },
        });
      }

      // Validar imagenes
      if (!validateImageUrls(data.images)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_IMAGES', message: 'Las imagenes deben ser URLs válidas.' },
        });
      }

      // Validar specs size
      if (data.specs && !validateSpecsSize(data.specs)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SPECS_TOO_LARGE', message: 'El campo specs no puede exceder 10KB.' },
        });
      }

      const product = await prisma.product.create({
        data: {
          sku: data.sku,
          name: sanitizedName,
          slug,
          description: sanitizedDescription,
          specs: data.specs ?? {},
          price: data.price,
          comparePrice: data.comparePrice ?? null,
          cost: data.cost,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          images: data.images,
          isActive: data.isActive,
          isFeatured: data.isFeatured,
          categoryId: data.categoryId,
          brandId: data.brandId ?? null,
        },
      });

      // Invalidar cache
      await cache.invalidateAllProducts();

      // Log de auditoria
      await logAdminAction(
        adminId,
        'CREATE_PRODUCT',
        'Product',
        product.id,
        null,
        { sku: data.sku, name: sanitizedName, price: data.price },
        request.ip
      );

      return reply.status(201).send({ success: true, data: product });
    }
  );

  // PUT /api/admin/products/:id — Actualizar producto
  app.put(
    '/api/admin/products/:id',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const { id } = request.params as { id: string };
      const data = request.validate(UpdateProductSchema, 'body') as UpdateProductInput;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' },
        });
      }

      // Sanitizar
      const sanitizedName = data.name ? sanitizeHtml(data.name) : undefined;
      const sanitizedDescription = data.description
        ? sanitizeHtml(data.description)
        : undefined;

      // Validar imagenes
      if (data.images && !validateImageUrls(data.images)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_IMAGES', message: 'Las imagenes deben ser URLs válidas.' },
        });
      }

      // Validar specs
      if (data.specs && !validateSpecsSize(data.specs)) {
        return reply.status(400).send({
          success: false,
          error: { code: 'SPECS_TOO_LARGE', message: 'El campo specs no puede exceder 10KB.' },
        });
      }

      const oldValues = { ...existing };

      const updated = await prisma.product.update({
        where: { id },
        data: {
          ...(data.sku && { sku: data.sku }),
          ...(sanitizedName && { name: sanitizedName }),
          ...(sanitizedDescription && { description: sanitizedDescription }),
          ...(data.specs && { specs: data.specs }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.comparePrice !== undefined && { comparePrice: data.comparePrice }),
          ...(data.cost !== undefined && { cost: data.cost }),
          ...(data.stock !== undefined && { stock: data.stock }),
          ...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold }),
          ...(data.images && { images: data.images }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
          ...(data.categoryId && { categoryId: data.categoryId }),
          ...(data.brandId !== undefined && { brandId: data.brandId }),
        },
      });

      // Invalidar cache
      await cache.invalidateProduct(existing.slug);

      // Log auditoria
      await logAdminAction(
        adminId,
        'UPDATE_PRODUCT',
        'Product',
        id,
        oldValues,
        { ...updated },
        request.ip
      );

      return reply.status(200).send({ success: true, data: updated });
    }
  );

  // PATCH /api/admin/products/:id/stock — Actualizar stock
  app.patch(
    '/api/admin/products/:id/stock',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const { id } = request.params as { id: string };
      const data = request.validate(UpdateStockSchema, 'body') as UpdateStockInput;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' },
        });
      }

      const updated = await prisma.product.update({
        where: { id },
        data: { stock: data.stock },
      });

      // Alertar si stock bajo
      const stockStatus = getStockStatus(data.stock, existing.lowStockThreshold);
      if (stockStatus === 'low_stock') {
        app.log.warn({
          action: 'LOW_STOCK_ALERT',
          productId: id,
          sku: existing.sku,
          stock: data.stock,
          threshold: existing.lowStockThreshold,
        });
      }

      // Invalidar cache
      await cache.invalidateProduct(existing.slug);

      // Log auditoria
      await logAdminAction(
        adminId,
        'UPDATE_STOCK',
        'Product',
        id,
        { stock: existing.stock },
        { stock: data.stock },
        request.ip
      );

      return reply.status(200).send({ success: true, data: updated });
    }
  );

  // DELETE /api/admin/products/:id — Soft delete
  app.delete(
    '/api/admin/products/:id',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const { id } = request.params as { id: string };

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Producto no encontrado.' },
        });
      }

      const updated = await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      // Invalidar cache
      await cache.invalidateProduct(existing.slug);

      // Log auditoria
      await logAdminAction(
        adminId,
        'DELETE_PRODUCT',
        'Product',
        id,
        { isActive: true },
        { isActive: false },
        request.ip
      );

      return reply.status(200).send({ success: true, data: updated });
    }
  );

  // POST /api/admin/categories — Crear categoria
  app.post(
    '/api/admin/categories',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const data = request.validate(CreateCategorySchema, 'body') as CreateCategoryInput;

      const slug = data.slug || (await generateCategorySlug(data.name));

      const category = await prisma.category.create({
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          image: data.image ?? null,
          parentId: data.parentId ?? null,
        },
      });

      // Invalidar cache
      await cache.invalidate('categories:*');

      // Log auditoria
      await logAdminAction(adminId, 'CREATE_CATEGORY', 'Category', category.id, null, { name: data.name }, request.ip);

      return reply.status(201).send({ success: true, data: category });
    }
  );

  // POST /api/admin/brands — Crear marca
  app.post(
    '/api/admin/brands',
    { preHandler: [authenticate, requireAdmin, requireMFA, requireAdminSession] },
    async (request, reply) => {
      const adminId = request.user!.id;
      const data = request.validate(CreateBrandSchema, 'body') as CreateBrandInput;

      const slug = data.slug || (await generateBrandSlug(data.name));

      const brand = await prisma.brand.create({
        data: {
          name: data.name,
          slug,
          logo: data.logo ?? null,
        },
      });

      // Invalidar cache
      await cache.invalidate('brands:list');

      // Log auditoria
      await logAdminAction(adminId, 'CREATE_BRAND', 'Brand', brand.id, null, { name: data.name }, request.ip);

      return reply.status(201).send({ success: true, data: brand });
    }
  );
}
