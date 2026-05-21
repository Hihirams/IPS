'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { SearchBar } from '@/components/search-bar';
import { CartProvider, useCart } from '@/components/cart-provider';
import { useAuth } from '@/lib/auth-context';

function Header() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-bold text-white">
            ET
          </span>
          <span className="hidden sm:inline">Ecommerce Tech</span>
        </Link>

        <div className="hidden flex-1 px-8 md:block">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/productos"
            className="hidden text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:inline-block"
          >
            Productos
          </Link>
          <Link
            href="/carrito"
            className="relative flex items-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
            <span className="hidden sm:inline">Carrito</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/perfil"
                className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-block"
              >
                Mi Perfil
              </Link>
              <Link
                href="/pedidos"
                className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline-block"
              >
                Pedidos
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
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="ml-1 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
          <div className="mb-3">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <nav className="space-y-2">
            <Link href="/productos" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
              Todos los Productos
            </Link>
            {user && (
              <>
                <Link href="/perfil" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  Mi Perfil
                </Link>
                <Link href="/pedidos" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  Mis Pedidos
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-bold text-white">
                ET
              </span>
              <h3 className="text-lg font-bold text-slate-900">Ecommerce Tech</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Tu tienda de confianza para productos tecnológicos con catálogo actualizado diariamente.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Navegar</h4>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li><Link href="/productos" className="hover:text-slate-900">Todos los Productos</Link></li>
              <li><Link href="/productos?soloStock=true" className="hover:text-slate-900">Disponibles</Link></li>
              <li><Link href="/productos?ordenarPor=price&orden=asc" className="hover:text-slate-900">Mejores Precios</Link></li>
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
          © {new Date().getFullYear()} Ecommerce Tech. Todos los derechos reservados.
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
