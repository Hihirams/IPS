import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StarRating } from '@/components/star-rating';
import { api } from '@/lib/api';
import type { PublicProductDetail } from '@ecommerce/types';
import type { Metadata } from 'next';

/**
 * Página de detalle de producto.
 *
 * - generateStaticParams para pre-render de productos populares
 * - generateMetadata con OG tags dinámicos
 * - Galería de imágenes con zoom CSS
 * - Especificaciones técnicas del campo specs JSON
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

async function getRelatedProducts(categoryId: string, excludeSlug: string) {
  try {
    const res = await api(
      `/api/products?category=${categoryId}&limit=4`
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

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;

  return {
    title: `${product.name} | Ecommerce Tech`,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0]] : [],
      type: 'product',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images[0] ? [product.images[0]] : [],
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'MXN',
      ...(discount > 0 && { 'product:discount': `${discount}%` }),
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product.categoryId, slug);

  const discount = product.comparePrice
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-slate-900">Inicio</Link>
        <span className="mx-2">/</span>
        <Link href="/productos" className="hover:text-slate-900">Productos</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Galería de imágenes */}
        <div className="space-y-4">
          <div className="group relative aspect-square overflow-hidden rounded-xl bg-slate-100">
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((img, i) => (
                <div
                  key={i}
                  className="group aspect-square overflow-hidden rounded-lg bg-slate-100"
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${i + 2}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
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
                <span className="text-sm font-medium text-slate-500">
                  {product.brand.name}
                </span>
              )}
              {discount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  -{discount}%
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{product.name}</h1>

            {product.reviewSummary && product.reviewSummary.totalReviews > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={product.reviewSummary.averageRating} readOnly size="sm" />
                <span className="text-sm text-slate-600">
                  ({product.reviewSummary.totalReviews} reseñas)
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-slate-900">
                ${product.price.toLocaleString('es-MX')}
              </span>
              {product.comparePrice && (
                <span className="text-lg text-slate-400 line-through">
                  ${product.comparePrice.toLocaleString('es-MX')}
                </span>
              )}
            </div>

            {/* Stock status */}
            {product.stockStatus === 'available' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Disponible
              </span>
            )}
            {product.stockStatus === 'low_stock' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Pocas unidades
              </span>
            )}
            {product.stockStatus === 'out_of_stock' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Agotado
              </span>
            )}
          </div>

          <p className="text-slate-600 leading-relaxed">{product.description}</p>

          {/* Selector de cantidad + Agregar al carrito */}
          {product.stockStatus !== 'out_of_stock' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-slate-200">
                <button className="px-3 py-2 text-slate-600 hover:bg-slate-50">-</button>
                <span className="w-10 text-center text-sm font-medium">1</span>
                <button className="px-3 py-2 text-slate-600 hover:bg-slate-50">+</button>
              </div>
              <button className="flex-1 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Agregar al Carrito
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Especificaciones */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-900">Especificaciones Técnicas</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-slate-200">
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="bg-white even:bg-slate-50">
                    <th className="w-1/3 px-6 py-4 font-medium text-slate-900 capitalize">
                      {key}
                    </th>
                    <td className="px-6 py-4 text-slate-600">{String(value)}</td>
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
          <h2 className="text-xl font-bold text-slate-900">Reseñas</h2>
          <div className="mt-4 space-y-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
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
            {relatedProducts.map((p: Record<string, unknown>) => (
              <Link
                key={p.id as string}
                href={`/productos/${p.slug}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden rounded-lg bg-slate-100">
                  <img
                    src={(p.images as string[])[0]}
                    alt={p.name as string}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 font-medium text-slate-900">{p.name as string}</h3>
                <p className="mt-1 font-semibold text-slate-900">
                  ${(p.price as number).toLocaleString('es-MX')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
