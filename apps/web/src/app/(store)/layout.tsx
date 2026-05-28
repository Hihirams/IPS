'use client';

import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { CartProvider } from '@/components/cart-provider';

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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}