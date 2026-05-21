import { prisma } from '../lib/prisma';
import { SyscomService } from './syscom.service';
import type { SyscomCategory, SyscomCategoryDetail, SyscomBrand, SyscomProduct, SyscomProductDetail } from './syscom.service';
import { generateSlug, generateCategorySlug, generateBrandSlug } from '../modules/products/products.helpers';
import type { Prisma } from '@prisma/client';
import type { FastifyInstance } from 'fastify';

interface SyncStats {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

function parseCategoryLevel(nivel: string | number): number {
  const level = typeof nivel === 'number' ? nivel : Number(nivel);
  return Number.isFinite(level) && level > 0 ? level : 1;
}

/** SYSCOM a veces devuelve URLs sin esquema; Next/Image requiere URL absoluta. */
function normalizeImageUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function buildProductImages(product: SyscomProduct, detail?: SyscomProductDetail): string[] {
  const images: string[] = [];
  const add = (url: string | undefined | null) => {
    const normalized = normalizeImageUrl(url);
    if (normalized && !images.includes(normalized)) images.push(normalized);
  };

  add(product.img_portada);
  if (detail) {
    add(detail.img_portada);
    if (detail.imagenes?.length) {
      const sorted = [...detail.imagenes].sort((a, b) => a.orden - b.orden);
      for (const img of sorted) add(img.url);
    }
  }

  return images;
}

export class SyncService {
  private syscom: SyscomService;
  private log: FastifyInstance['log'];

  constructor(app: FastifyInstance) {
    this.syscom = new SyscomService(app);
    this.log = app.log;
  }

  async syncCategories(): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };

    this.log.info('Iniciando sincronizacion de categorias SYSCOM...');

    const topLevelCategories = await this.syscom.getCategories();
    stats.processed += topLevelCategories.length;

    for (const cat of topLevelCategories) {
      try {
        const existing = await prisma.category.findFirst({ where: { syscomId: String(cat.id) } });

        if (existing) {
          await prisma.category.update({
            where: { id: existing.id },
            data: {
              name: cat.nombre,
              level: parseCategoryLevel(cat.nivel),
            },
          });
          stats.updated++;
        } else {
          const slug = await generateCategorySlug(cat.nombre);
          await prisma.category.create({
            data: {
              syscomId: String(cat.id),
              name: cat.nombre,
              slug,
              level: parseCategoryLevel(cat.nivel),
              isActive: true,
            },
          });
          stats.created++;
        }

        // Recursively sync subcategories
        try {
          const detail = await this.syscom.getCategoryById(cat.id);
          const subcategories = detail.subcategorías ?? detail.subcategorias ?? [];
          if (subcategories.length > 0) {
            const subStats = await this.syncSubcategories(cat.id, subcategories);
            stats.processed += subStats.processed;
            stats.created += subStats.created;
            stats.updated += subStats.updated;
            stats.skipped += subStats.skipped;
            stats.errors.push(...subStats.errors);
          }
        } catch (err) {
          this.log.warn({ catId: cat.id, err }, 'Error obteniendo subcategorias');
          stats.errors.push(`Subcategorias de ${cat.nombre} (ID ${cat.id}): ${err instanceof Error ? err.message : String(err)}`);
        }
      } catch (err) {
        this.log.error({ cat, err }, 'Error sincronizando categoria');
        stats.errors.push(`Categoria ${cat.nombre} (ID ${cat.id}): ${err instanceof Error ? err.message : String(err)}`);
        stats.skipped++;
      }
    }

    this.log.info({ stats }, 'Sincronizacion de categorias completada');
    return stats;
  }

  private async syncSubcategories(parentSyscomId: string | number, subcategories: SyscomCategory[]): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };

    const parentCategory = await prisma.category.findFirst({ where: { syscomId: String(parentSyscomId) } });
    if (!parentCategory) {
      stats.errors.push(`Categoria padre SYSCOM ID ${parentSyscomId} no encontrada en DB`);
      stats.skipped += subcategories.length;
      return stats;
    }

    for (const sub of subcategories) {
      try {
        const existing = await prisma.category.findFirst({ where: { syscomId: String(sub.id) } });

        if (existing) {
          await prisma.category.update({
            where: { id: existing.id },
            data: {
              name: sub.nombre,
              parentId: parentCategory.id,
              level: parseCategoryLevel(sub.nivel),
            },
          });
          stats.updated++;
        } else {
          const slug = await generateCategorySlug(sub.nombre);
          await prisma.category.create({
            data: {
              syscomId: String(sub.id),
              name: sub.nombre,
              slug,
              parentId: parentCategory.id,
              level: parseCategoryLevel(sub.nivel),
              isActive: true,
            },
          });
          stats.created++;
        }
        stats.processed++;

        // Recursión: subcategorías de nivel 3+
        try {
          const detail = await this.syscom.getCategoryById(sub.id);
          const nested = detail.subcategorías ?? detail.subcategorias ?? [];
          if (nested.length > 0) {
            const nestedStats = await this.syncSubcategories(sub.id, nested);
            stats.processed += nestedStats.processed;
            stats.created += nestedStats.created;
            stats.updated += nestedStats.updated;
            stats.skipped += nestedStats.skipped;
            stats.errors.push(...nestedStats.errors);
          }
        } catch (err) {
          this.log.warn({ subId: sub.id, err }, 'Error obteniendo subcategorias anidadas');
        }
      } catch (err) {
        stats.errors.push(`Subcategoria ${sub.nombre}: ${err instanceof Error ? err.message : String(err)}`);
        stats.skipped++;
      }
    }

    return stats;
  }

  async syncBrands(): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };

    this.log.info('Iniciando sincronizacion de marcas SYSCOM...');

    const brands = await this.syscom.getBrands();
    stats.processed = brands.length;

    for (const brand of brands) {
      try {
        const existing = await prisma.brand.findFirst({ where: { syscomId: String(brand.id) } });

        if (existing) {
          await prisma.brand.update({
            where: { id: existing.id },
            data: { name: brand.nombre },
          });
          stats.updated++;
        } else {
          const slug = await generateBrandSlug(brand.nombre);
          await prisma.brand.create({
            data: {
              syscomId: String(brand.id),
              name: brand.nombre,
              slug,
              isActive: true,
            },
          });
          stats.created++;
        }
      } catch (err) {
        this.log.error({ brand, err }, 'Error sincronizando marca');
        stats.errors.push(`Marca ${brand.nombre} (ID ${brand.id}): ${err instanceof Error ? err.message : String(err)}`);
        stats.skipped++;
      }
    }

    this.log.info({ stats }, 'Sincronizacion de marcas completada');
    return stats;
  }

  /**
   * Sincroniza productos SYSCOM.
   * La API exige al menos uno de: categoria, marca o busqueda.
   * Sin categoryId: recorre todas las categorias locales con syscomId.
   */
  async syncProducts(categoryId?: string, maxPages?: number): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };
    const seenProductIds = new Set<string>();

    this.log.info({ categoryId }, 'Iniciando sincronizacion de productos SYSCOM...');

    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { syscomId: categoryId } });
      if (!category) {
        throw new Error(`Categoria SYSCOM ID ${categoryId} no encontrada en DB`);
      }
      return this.syncProductsForSyscomCategory(categoryId, seenProductIds, maxPages);
    }

    const categories = await prisma.category.findMany({
      where: { syscomId: { not: null } },
      select: { syscomId: true, name: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    if (categories.length === 0) {
      throw new Error(
        'No hay categorias con syscomId en la base de datos. Ejecuta POST /api/admin/sync/categories primero.'
      );
    }

    const totalCategories = categories.filter((c) => c.syscomId).length;
    let categoryIndex = 0;

    for (const category of categories) {
      if (!category.syscomId) continue;
      categoryIndex++;
      this.log.info(
        { category: category.name, syscomId: category.syscomId, progress: `${categoryIndex}/${totalCategories}` },
        'Sincronizando productos de categoria SYSCOM'
      );

      try {
        const catStats = await this.syncProductsForSyscomCategory(
          category.syscomId,
          seenProductIds,
          maxPages
        );
        stats.processed += catStats.processed;
        stats.created += catStats.created;
        stats.updated += catStats.updated;
        stats.skipped += catStats.skipped;
        stats.errors.push(...catStats.errors);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.log.error({ category, err }, 'Error sincronizando productos de categoria');
        stats.errors.push(`Categoria ${category.name} (${category.syscomId}): ${message}`);
      }
    }

    const deactivated = await prisma.product.updateMany({
      where: {
        syscomId: { not: null },
        lastSyncedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        isActive: true,
      },
      data: { isActive: false },
    });
    this.log.info({ deactivated: deactivated.count }, 'Productos desactivados (no encontrados en SYSCOM)');

    this.log.info({ stats }, 'Sincronizacion de productos completada');
    return stats;
  }

  private async syncProductsForSyscomCategory(
    syscomCategoryId: string,
    seenProductIds: Set<string>,
    maxPages?: number
  ): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };

    let page = 1;
    let totalPages = 1;
    const pageLimit = maxPages && maxPages > 0 ? maxPages : undefined;

    do {
      try {
        const result = await this.syscom.getProducts({
          categoria: syscomCategoryId,
          pagina: page,
        });

        totalPages = result.paginas;

        for (const product of result.productos) {
          const syscomId = String(product.producto_id);
          if (seenProductIds.has(syscomId)) {
            stats.skipped++;
            continue;
          }
          seenProductIds.add(syscomId);

          try {
            const outcome = await this.upsertProduct(product);
            if (outcome === 'skipped') {
              stats.skipped++;
              continue;
            }
            stats.processed++;
            if (outcome === 'updated') stats.updated++;
            else stats.created++;
          } catch (err) {
            this.log.error({ product, err }, 'Error sincronizando producto');
            stats.errors.push(
              `Producto ${product.modelo} (ID ${product.producto_id}): ${err instanceof Error ? err.message : String(err)}`
            );
            stats.skipped++;
          }
        }
      } catch (err) {
        this.log.error({ page, syscomCategoryId, err }, 'Error obteniendo pagina de productos SYSCOM');
        stats.errors.push(
          `Categoria ${syscomCategoryId} pagina ${page}: ${err instanceof Error ? err.message : String(err)}`
        );
        break;
      }

      page++;
    } while (page <= totalPages && (!pageLimit || page <= pageLimit));

    return stats;
  }

  private async upsertProduct(
    product: SyscomProduct
  ): Promise<'created' | 'updated' | 'skipped'> {
    const syscomId = String(product.producto_id);
    const existing = await prisma.product.findFirst({ where: { syscomId } });

    // Resolve category: prefer deepest level in DB, else shallowest match
    let categoryId: string | undefined;
    if (product.categorias && product.categorias.length > 0) {
      const byDepth = [...product.categorias].sort(
        (a, b) => parseCategoryLevel(b.nivel) - parseCategoryLevel(a.nivel)
      );
      for (const cat of byDepth) {
        const category = await prisma.category.findFirst({
          where: { syscomId: String(cat.id) },
        });
        if (category) {
          categoryId = category.id;
          break;
        }
      }
      if (!categoryId) {
        for (const cat of [...byDepth].reverse()) {
          const category = await prisma.category.findFirst({
            where: { syscomId: String(cat.id) },
          });
          if (category) {
            categoryId = category.id;
            break;
          }
        }
      }
    }

    // Resolve brand
    let brandId: string | undefined;
    if (product.marca) {
      const brand = await prisma.brand.findFirst({
        where: { name: { equals: product.marca, mode: 'insensitive' } },
      });
      if (brand) brandId = brand.id;
    }

    // Calculate prices
    const precios = product.precios || {};
    const price = Number(precios.precio_lista ?? precios.precio_especial ?? 0);
    const comparePrice = Number(precios.precio_especial ?? 0) > 0 ? Number(precios.precio_especial) : null;
    const cost = Number(precios.precio_descuento ?? precios.precio_lista ?? 0);
    const stock = product.total_existencia ?? 0;

    const images = buildProductImages(product);

    // Build specs from available data
    const specs: Record<string, unknown> = {};
    if (product.modelo) specs.modelo = product.modelo;
    if (product.sat_key) specs.satKey = product.sat_key;
    if (product.link) specs.syscomLink = product.link;

    // If product has icons, add them
    const iconos = product.iconos;
    if (iconos) {
      if (iconos.sup_der) specs.iconoSuperiorDerecho = iconos.sup_der;
      if (iconos.inf_der) specs.iconoInferiorDerecho = iconos.inf_der;
      if (iconos.sup_izq) specs.iconoSuperiorIzquierdo = iconos.sup_izq;
      if (iconos.inf_izq) specs.iconoInferiorIzquierdo = iconos.inf_izq;
    }

    if (existing) {
      // Update only if data changed
      const updateData: Prisma.ProductUpdateInput = {
        name: product.titulo || existing.name,
        stock,
        price: price > 0 ? price : undefined,
        ...(comparePrice ? { comparePrice } : {}),
        ...(cost > 0 ? { cost } : {}),
        images: images.length > 0 ? images : undefined,
        lastSyncedAt: new Date(),
        isActive: true,
        ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
        ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
        ...(product.marca_logo ? { brand: brandId ? { connect: { id: brandId } } : undefined } : {}),
        satKey: product.sat_key || undefined,
        originalLink: product.link || undefined,
        specs: Object.keys(specs).length > 0 ? specs as unknown as Prisma.JsonValue : undefined,
      };

      await prisma.product.update({
        where: { id: existing.id },
        data: updateData,
      });
      return 'updated';
    }

    // Create new product
    if (!categoryId) {
      this.log.warn({ syscomId, name: product.titulo }, 'Producto sin categoria, saltando');
      return 'skipped';
    }

    const slug = await generateSlug(product.titulo || product.modelo || `product-${syscomId}`);
      const sku = product.modelo || `SYSCOM-${syscomId}`;

      await prisma.product.create({
        data: {
          syscomId,
          sku,
          name: product.titulo || product.modelo || `Producto ${syscomId}`,
          slug,
          description: product.titulo || product.modelo || '',
          specs: Object.keys(specs).length > 0 ? specs as unknown as Prisma.JsonValue : {},
          price: price > 0 ? price : 1,
          comparePrice,
          cost: cost > 0 ? cost : price > 0 ? price : 1,
          stock,
          lowStockThreshold: 5,
          images: images.length > 0 ? images : ['/placeholder-product.png'],
          isActive: true,
          isFeatured: false,
          satKey: product.sat_key || null,
          originalLink: product.link || null,
          lastSyncedAt: new Date(),
          categoryId,
          brandId: brandId || null,
        },
      });
    return 'created';
  }

  async syncFullProductDetail(syscomProductId: string | number): Promise<SyncStats> {
    const stats: SyncStats = { processed: 1, created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      const detail = await this.syscom.getProductById(syscomProductId);

      const images = buildProductImages(detail);

      // Build full specs from detail
      const specs: Record<string, unknown> = {};
      if (detail.modelo) specs.modelo = detail.modelo;
      if (detail.sat_key) specs.satKey = detail.sat_key;
      if (detail.link) specs.syscomLink = detail.link;
      if (detail.caracteristicas && Array.isArray(detail.caracteristicas) && detail.caracteristicas.length > 0) {
        specs.caracteristicas = detail.caracteristicas;
      }
      if (detail.descripcion) specs.descripcionCompleta = detail.descripcion;

      // Update existing product with full detail
      const existing = await prisma.product.findFirst({ where: { syscomId: String(syscomProductId) } });
      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            description: detail.descripcion || existing.description,
            images: images.length > 0 ? images : existing.images,
            specs: Object.keys(specs).length > 0 ? specs as unknown as Prisma.JsonValue : existing.specs as Prisma.JsonValue,
            lastSyncedAt: new Date(),
          },
        });
        stats.updated++;
      } else {
        stats.skipped++;
      }
    } catch (err) {
      stats.errors.push(`Producto detalle ${syscomProductId}: ${err instanceof Error ? err.message : String(err)}`);
      stats.skipped++;
    }

    return stats;
  }

  async getLatestSyncStatus(): Promise<{
    categories: { status: string; completedAt: Date | null } | null;
    brands: { status: string; completedAt: Date | null } | null;
    products: { status: string; completedAt: Date | null } | null;
  }> {
    const [catLog, brandLog, prodLog] = await Promise.all([
      prisma.syncLog.findFirst({ where: { entityType: 'CATEGORIES' }, orderBy: { startedAt: 'desc' } }),
      prisma.syncLog.findFirst({ where: { entityType: 'BRANDS' }, orderBy: { startedAt: 'desc' } }),
      prisma.syncLog.findFirst({ where: { entityType: 'PRODUCTS' }, orderBy: { startedAt: 'desc' } }),
    ]);

    return {
      categories: catLog ? { status: catLog.status, completedAt: catLog.completedAt } : null,
      brands: brandLog ? { status: brandLog.status, completedAt: brandLog.completedAt } : null,
      products: prodLog ? { status: prodLog.status, completedAt: prodLog.completedAt } : null,
    };
  }

  /**
   * Obtiene galería completa desde SYSCOM para productos ya importados (1 req/producto).
   */
  async enrichProductImages(options?: { limit?: number; offset?: number }): Promise<SyncStats> {
    const stats: SyncStats = { processed: 0, created: 0, updated: 0, skipped: 0, errors: [] };
    const products = await prisma.product.findMany({
      where: { syscomId: { not: null } },
      select: { syscomId: true },
      orderBy: { updatedAt: 'asc' },
      skip: options?.offset ?? 0,
      take: options?.limit,
    });

    this.log.info({ count: products.length }, 'Enriqueciendo imagenes de productos SYSCOM...');

    for (const row of products) {
      if (!row.syscomId) continue;
      stats.processed++;
      try {
        const detailStats = await this.syncFullProductDetail(row.syscomId);
        if (detailStats.updated > 0) stats.updated++;
        else stats.skipped++;
        stats.errors.push(...detailStats.errors);
      } catch (err) {
        stats.errors.push(
          `Imagenes ${row.syscomId}: ${err instanceof Error ? err.message : String(err)}`
        );
        stats.skipped++;
      }
    }

    return stats;
  }

  async getSyncLogs(limit = 20): Promise<ReturnType<typeof prisma.syncLog.findMany>> {
    return prisma.syncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async syncExchangeRate(): Promise<SyncStats> {
    const stats: SyncStats = { processed: 1, created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      const rates = await this.syscom.getExchangeRate();
      this.log.info({ rates }, 'Tipo de cambio SYSCOM obtenido');
      stats.processed = 1;
      stats.updated = 1;
    } catch (err) {
      stats.errors.push(`Exchange rate: ${err instanceof Error ? err.message : String(err)}`);
      stats.skipped = 1;
    }

    return stats;
  }
}