import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCartControls } from '@/components/add-to-cart-controls';
import { StarRating } from '@/components/star-rating';
import { ProductCard } from '@/components/product-card';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { PublicProduct, PublicProductDetail } from '@ecommerce/types';
import type { Metadata } from 'next';

/**
 * Página de detalle de producto.
 *
 * - generateStaticParams para pre-render de productos populares
 * - generateMetadata con OG tags dinámicos
 * - Galería de imágenes con thumbnails
 * - Especificaciones técnicas del campo specs JSON
 * - Botón de "Comprar Ahora"
 */

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render de los 20 productos más populares
export async function generateStaticParams() {
  try {
    const res = await api('/api/products?limit=20&sortBy=createdAt&sortOrder=desc');
    const json = await res.json();
    const products = json.data?.data ?? [];
    return products.map((p: { slug: string }) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

async function getProduct(slug: string): Promise<PublicProductDetail | null> {
  try {
    const res = await api(`/api/products/${slug}`);
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function getRelatedProducts(categorySlug: string, excludeSlug: string): Promise<PublicProduct[]> {
  try {
    const res = await api(
      `/api/products?category=${categorySlug}&limit=4`
    );
    const json = await res.json();
    const products = json.data?.data ?? [];
    return products.filter((p: { slug: string }) => p.slug !== excludeSlug);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Producto no encontrado | Ecommerce Tech',
    };
  }

return {
    title: `${product.name} | Ecommerce Tech`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0]] : [],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0]] : [],
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'MXN',
    },
  };
}

/** Labels legibles para las keys de specs de SYSCOM */
const SPEC_LABELS: Record<string, string> = {
  modelo: 'Modelo',
  satKey: 'Clave SAT',
  syscomLink: 'Link del proveedor',
  descripcionCompleta: 'Descripción detallada',
  caracteristicas: 'Características',
  iconoSuperiorDerecho: 'Icono Superior Derecho',
  iconoInferiorDerecho: 'Icono Inferior Derecho',
  iconoSuperiorIzquierdo: 'Icono Superior Izquierdo',
  iconoInferiorIzquierdo: 'Icono Inferior Izquierdo',
};

function formatSpecValue(_key: string, value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  return String(value);
}

function formatSpecLabel(key: string): string {
  if (SPEC_LABELS[key]) return SPEC_LABELS[key];
  // camelCase → Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const categorySlug = product.category?.slug ?? '';
  const relatedProducts = categorySlug
    ? await getRelatedProducts(categorySlug, slug)
    : [];

  // Filter specs to show meaningful ones
  const specs = product.specs ?? {};
  const specsToHide = new Set(['syscomLink', 'iconoSuperiorDerecho', 'iconoInferiorDerecho', 'iconoSuperiorIzquierdo', 'iconoInferiorIzquierdo']);
  const visibleSpecs = Object.entries(specs).filter(
    ([key, value]) => !specsToHide.has(key) && value !== null && value !== undefined && value !== ''
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/productos" className="hover:text-slate-900">Productos</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/productos?categoria=${product.category.slug}`} className="hover:text-slate-900">
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galería de imágenes */}
        <div className="space-y-4">
          <div className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-white">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(0, 8).map((img, i) => (
                <div
                  key={i}
                  className="group aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-indigo-300"
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${i + 1}`}
                    className="h-full w-full object-contain p-1 transition duration-300 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              {product.brand && (
                <Link
                  href={`/productos?marca=${product.brand.slug}`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {product.brand.name}
                </Link>
              )}
              {product.category && (
                <Link
                  href={`/productos?categoria=${product.category.slug}`}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200"
                >
                  {product.category.name}
                </Link>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 lg:text-3xl">{product.name}</h1>

            {product.reviewSummary && product.reviewSummary.totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={product.reviewSummary.averageRating} readOnly size="sm" />
                <span className="text-sm text-slate-600">
                  ({product.reviewSummary.totalReviews} reseñas)
                </span>
              </div>
            )}

            {/* SKU */}
            <p className="mt-1 text-xs text-slate-400">SKU: {product.sku}</p>
          </div>

          {/* Precios */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <span className="text-3xl font-bold text-slate-900">
              {formatPrice(product.price)}
            </span>
            <p className="mt-1 text-xs text-slate-500">Precio en MXN + IVA</p>
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-3">
            {product.stockStatus === 'available' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 ring-1 ring-green-200">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                En stock — Disponible
              </span>
            )}
            {product.stockStatus === 'low_stock' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                ¡Pocas unidades disponibles!
              </span>
            )}
            {product.stockStatus === 'out_of_stock' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Entrega en aproximadamente 4 días hábiles
              </span>
            )}
          </div>

          {/* Descripción */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Descripción</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{product.description}</p>
            </div>
          )}

          {/* Selector de cantidad + Agregar al carrito */}
          <div className="space-y-3">
            <AddToCartControls productId={product.id} />
            <Link
              href="/carrito"
              className="block w-full rounded-xl border-2 border-indigo-600 py-3 text-center text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              Comprar Ahora
            </Link>
          </div>

          {/* Info adicional */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Envío a todo México
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Pago seguro con Stripe
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Garantía incluida
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Facturación disponible
            </div>
          </div>
        </div>
      </div>

      {/* Especificaciones */}
      {visibleSpecs.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Especificaciones Técnicas</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-200">
                {visibleSpecs.map(([key, value]) => (
                  <tr key={key} className="bg-white even:bg-slate-50">
                    <th className="w-1/3 px-6 py-4 font-medium text-slate-900">
                      {formatSpecLabel(key)}
                    </th>
                    <td className="px-6 py-4 text-slate-600">{formatSpecValue(key, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reseñas */}
      {product.reviews && product.reviews.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Reseñas de clientes</h2>
          <div className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                      {(review.user?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {review.user?.name ?? 'Usuario'}
                    </span>
                  </div>
                  <StarRating rating={review.rating} readOnly size="sm" />
                </div>
                <h4 className="mt-3 font-semibold text-slate-900">{review.title}</h4>
                <p className="mt-1 text-sm text-slate-600">{review.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Productos Relacionados</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
