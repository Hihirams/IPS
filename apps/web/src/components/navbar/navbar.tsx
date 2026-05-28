'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { IconMenu2, IconX, IconShoppingCart, IconUser } from '@tabler/icons-react';
import { Suspense } from 'react';
import { SearchBar } from '@/components/search-bar';
import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/lib/auth-context';
import type { SafeUser } from '@ecommerce/types';
import { NavbarTopBar } from './navbar-top-bar';
import { NavbarSidePill } from './navbar-side-pill';
import { NavbarMegaPanel } from './navbar-mega-panel';

export function Navbar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const [sideExpanded, setSideExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeNavId, setActiveNavId] = useState<string | null>(null);
  const [panelTop, setPanelTop] = useState(82);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeAll = useCallback(() => {
    setActiveSection(null);
    setActiveNavId(null);
  }, []);

  const handleNavClick = useCallback((panelKey: string, id: string) => {
    const navEl = document.getElementById(`nav-item-${id}`);
    if (navEl) {
      setPanelTop(navEl.getBoundingClientRect().top);
    }
    if (activeSection === panelKey) {
      setActiveSection(null);
      setActiveNavId(null);
      return;
    }
    setActiveSection(panelKey);
    setActiveNavId(id);
  }, [activeSection]);

  const expandSide = useCallback(() => setSideExpanded(true), []);
  const collapseSide = useCallback(() => setSideExpanded(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAll();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAll]);

  return (
    <>
      <NavbarTopBar onUserClick={() => {}} />

      <NavbarSidePill
        expanded={sideExpanded}
        activeSection={activeNavId}
        onHoverEnter={expandSide}
        onHoverLeave={collapseSide}
        onNavClick={handleNavClick}
      />

      {activeSection && (
        <div
          className="fixed inset-0 z-20 bg-slate-50/30 backdrop-blur-[4px] transition-opacity"
          onClick={closeAll}
        />
      )}

      {activeSection && (
        <NavbarMegaPanel
          panelKey={activeSection}
          sideExpanded={sideExpanded}
          top={panelTop}
        />
      )}

      <div className="h-[82px]" />

      <div className="md:hidden">
        <MobileHeader
          itemCount={itemCount}
          user={user}
          logout={logout}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      </div>
    </>
  );
}

function MobileHeader({
  itemCount,
  user,
  logout,
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  itemCount: number;
  user: SafeUser | null;
  logout: () => Promise<void>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-sm font-bold text-white">
            ET
          </span>
          <span className="hidden sm:inline">Ecommerce Tech</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/carrito"
            className="relative flex items-center gap-1 rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <IconShoppingCart size={16} />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <Link
              href="/perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <IconUser size={18} />
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
          )}

          <button
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
          </button>
        </nav>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="mb-3">
            <Suspense fallback={null}>
              <SearchBar />
            </Suspense>
          </div>
          <nav className="space-y-2">
            <Link href="/" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
              Inicio
            </Link>
            <Link href="/productos" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
              Productos
            </Link>
            {user && (
              <>
                <Link href="/perfil" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  Mi Perfil
                </Link>
                <Link href="/perfil/pedidos" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setMobileMenuOpen(false)}>
                  Mis Pedidos
                </Link>
                <button
                  onClick={() => { void logout(); setMobileMenuOpen(false); }}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-slate-50"
                >
                  Salir
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}