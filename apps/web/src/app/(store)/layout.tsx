'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { CartProvider, useCart } from '@/components/cart-provider';
import { useAuth } from '@/lib/auth-context';

function Header() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
          Ecommerce Tech
        </Link>

        <div className="hidden flex-1 px-8 md:block">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="flex items-center gap-6">
          <Link
            href="/productos"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Productos
          </Link>
          <Link
            href="/productos?categoria=laptops"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Laptops
          </Link>
          <Link
            href="/productos?categoria=smartphones"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Smartphones
          </Link>
          <Link
            href="/carrito"
            className="relative rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Carrito
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/perfil"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Mi Perfil
              </Link>
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Salir
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ecommerce Tech</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tu tienda de confianza para productos tecnológicos.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Categorías</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li><Link href="/productos?categoria=laptops">Laptops</Link></li>
              <li><Link href="/productos?categoria=smartphones">Smartphones</Link></li>
              <li><Link href="/productos?categoria=accesorios">Accesorios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Soporte</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>Contacto</li>
              <li>FAQ</li>
              <li>Envíos</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Legal</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li>Términos de servicio</li>
              <li>Política de privacidad</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
          © 2026 Ecommerce Tech. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main>{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
