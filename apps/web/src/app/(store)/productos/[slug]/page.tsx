import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCartControls } from '@/components/add-to-cart-controls';
import { StarRating } from '@/components/star-rating';
import { ProductCard } from '@/components/product-card';
import { api, API_URL } from '@/lib/api';
import { formatPriceMxn } from '@/lib/currency';
import { getDisplayCategoryForProduct } from '@/lib/categories';
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

/**
 * Render dinámico por petición.
 *
 * Antes la página dependía de generateStaticParams + ISR. En el build de
 * producción (Railway) API_URL llega vacío al Dockerfile, por lo que el fetch
 * de build caía a http://localhost:4000 y solo se pre-generaban (o fallaban)
 * unos pocos productos; el resto devolvía 404 en blanco. Renderizando en
 * cada request, todo producto existente se resuelve contra la API real.
 */
export const dynamic = 'force-dynamic';

async function getProduct(slug: string): Promise<PublicProductDetail | null> {
  const path = `/api/products/${encodeURIComponent(slug)}`;
  const res = await api(path, { next: { revalidate: 0 } });

  // 404 real → producto inexistente (notFound legítimo).
  if (res.status === 404) {
    return null;
  }

  // Cualquier otro fallo (5xx, red, API_URL mal configurado) NO debe
  // enmascararse como "producto no encontrado". Lo registramos y lo
  // propagamos para que se vea como error real y aparezca en los logs.
  if (!res.ok) {
    console.error(
      `[product-detail] fallo al cargar "${slug}": ${res.status} ${res.statusText} — base=${API_URL}`
    );
    throw new Error(`Backend respondió ${res.status} para ${path}`);
  }

  const json = await res.json();
  return json.data ?? null;
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
  // En metadata no queremos que un fallo de backend rompa el render;
  // si falla, devolvemos un título genérico.
  const product = await getProduct(slug).catch(() => null);

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

  const displayCat = getDisplayCategoryForProduct(product.category);
  const priceFormatted = await formatPriceMxn(product.price);

  // Filter specs to show meaningful ones
  const specs = product.specs ?? {};
  const specsToHide = new Set(['syscomLink', 'iconoSuperiorDerecho', 'iconoInferiorDerecho', 'iconoSuperiorIzquierdo', 'iconoInferiorIzquierdo']);
  const visibleSpecs = Object.entries(specs).filter(
    ([key, value]) => !specsToHide.has(key) && value !== null && value !== undefined && value !== ''
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="animate-fade-in mb-6 text-sm text-ink-3">
        <Link href="/" className="transition hover:text-ink-1">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/productos" className="transition hover:text-ink-1">Productos</Link>
        {displayCat && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/productos?categoria=${displayCat.slug}`} className="transition hover:text-ink-1">
              {displayCat.icon} {displayCat.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink-1">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galería de imágenes */}
        <div className="animate-fade-up space-y-4">
          <div className="glass-card group relative aspect-square overflow-hidden rounded-[24px]">
            {product.images[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="h-full w-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-4">
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
                  className="glass-card group aspect-square overflow-hidden rounded-[16px] transition hover:bg-white/90"
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${i + 1}`}
                    className="h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="animate-fade-up delay-1 space-y-6">
          <div>
            <div className="flex items-center gap-2">
               {product.brand && (
                 <Link
                   href={`/productos?marca=${product.brand.slug}`}
                   className="link-accent text-sm"
                 >
                   {product.brand.name}
                 </Link>
               )}
               {displayCat && (
                 <Link
                   href={`/productos?categoria=${displayCat.slug}`}
                   className="chip transition hover:bg-black/[0.08]"
                 >
                   {displayCat.icon} {displayCat.name}
                 </Link>
               )}
             </div>
            <h1 className="mt-2.5 text-2xl font-semibold tracking-tight text-ink-1 lg:text-3xl">{product.name}</h1>

            {product.reviewSummary && product.reviewSummary.totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={product.reviewSummary.averageRating} readOnly size="sm" />
                <span className="text-sm text-ink-2">
                  ({product.reviewSummary.totalReviews} reseñas)
                </span>
              </div>
            )}

            {/* SKU */}
            <p className="mt-1.5 text-xs text-ink-4">SKU: {product.sku}</p>
          </div>

          {/* Precios */}
          <div className="glass-card rounded-[20px] p-5">
            <span className="text-3xl font-semibold tracking-tight text-ink-1">
              {priceFormatted}
            </span>
            <p className="mt-1 text-xs text-ink-3">Precio en MXN + IVA</p>
          </div>

          {/* Stock status */}
          <div className="flex flex-wrap items-center gap-3">
            {product.stockStatus === 'available' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                En stock — {product.stock} unidades disponibles
              </span>
            )}
            {product.stockStatus === 'low_stock' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Pocas unidades — solo quedan {product.stock}
              </span>
            )}
            {product.stockStatus === 'out_of_stock' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-500/20">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Disponible por pedido — entrega ~1 semana
              </span>
            )}
          </div>

          {/* Descripción */}
          {product.description && (
            <div>
              <h3 className="text-sm font-semibold text-ink-1">Descripción</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{product.description}</p>
            </div>
          )}

          {/* Selector de cantidad + Agregar al carrito */}
          <div className="space-y-3">
            <AddToCartControls productId={product.id} />
            <Link href="/carrito" className="btn-secondary block w-full py-3 text-center">
              Comprar ahora
            </Link>
          </div>

          {/* Info adicional */}
          <div className="glass-card grid grid-cols-2 gap-3 rounded-[18px] p-4">
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <svg className="h-4 w-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Envío a todo México
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <svg className="h-4 w-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Pago seguro con Stripe
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <svg className="h-4 w-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Garantía incluida
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-2">
              <svg className="h-4 w-4 text-ink-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Facturación disponible
            </div>
          </div>
        </div>
      </div>

      {/* Especificaciones */}
      {visibleSpecs.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Especificaciones técnicas</h2>
          <div className="glass-card mt-4 overflow-hidden rounded-[22px]">
            <table className="w-full text-left text-sm">
              <tbody>
                {visibleSpecs.map(([key, value]) => (
                  <tr key={key} className="border-b border-[color:var(--hair-soft)] last:border-0 even:bg-black/[0.02]">
                    <th className="w-1/3 px-6 py-4 font-medium text-ink-1">
                      {formatSpecLabel(key)}
                    </th>
                    <td className="px-6 py-4 text-ink-2">{formatSpecValue(key, value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reseñas */}
      {product.reviews && product.reviews.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Reseñas de clientes</h2>
          <div className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="glass-card rounded-[22px] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold text-ink-1">
                      {(review.user?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-ink-1">
                      {review.user?.name ?? 'Usuario'}
                    </span>
                  </div>
                  <StarRating rating={review.rating} readOnly size="sm" />
                </div>
                <h4 className="mt-3 font-semibold text-ink-1">{review.title}</h4>
                <p className="mt-1 text-sm text-ink-2">{review.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Productos relacionados */}
      {relatedProducts.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-ink-1">Productos relacionados</h2>
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((p, i) => (
              <div key={p.id} className={`animate-fade-up delay-${Math.min(i, 8)}`}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
