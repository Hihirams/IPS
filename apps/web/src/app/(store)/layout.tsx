'use client';

import Link from 'next/link';
import { IconStar } from '@tabler/icons-react';
import { Navbar } from '@/components/navbar';
import { CartProvider } from '@/components/cart-provider';

function Footer() {
  return (
    <footer className="mt-20 px-4 pb-6 md:pl-[88px]">
      <div className="glass-card mx-auto max-w-7xl rounded-[28px] px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-ink-1">
                <IconStar size={18} />
              </span>
              <h3 className="text-lg font-semibold tracking-tight text-ink-1">MiTienda</h3>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-2">
              Tu tienda de confianza para tecnología y seguridad, con catálogo
              actualizado diariamente.
            </p>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-4">Navegar</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li><Link href="/productos" className="transition hover:text-ink-1">Todos los productos</Link></li>
              <li><Link href="/productos?soloStock=true" className="transition hover:text-ink-1">Disponibles</Link></li>
              <li><Link href="/productos?ordenarPor=price&orden=asc" className="transition hover:text-ink-1">Mejores precios</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-4">Soporte</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li className="transition hover:text-ink-1">Contacto</li>
              <li className="transition hover:text-ink-1">FAQ</li>
              <li className="transition hover:text-ink-1">Envíos</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.6px] text-ink-4">Legal</h4>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              <li className="transition hover:text-ink-1">Términos de servicio</li>
              <li className="transition hover:text-ink-1">Política de privacidad</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[color:var(--hair)] pt-6 text-center text-xs text-ink-3">
          © {new Date().getFullYear()} MiTienda. Todos los derechos reservados.
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
      <div className="min-h-screen">
        <Navbar />
        {/* Offset a la izquierda para dejar respirar el side pill en desktop */}
        <main className="md:pl-[80px]">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
