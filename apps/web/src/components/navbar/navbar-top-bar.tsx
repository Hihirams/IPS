'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  IconStar,
  IconSearch,
  IconHeart,
  IconShoppingCart,
  IconUser,
} from '@tabler/icons-react';
import { SearchBar } from '@/components/search-bar';
import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/lib/auth-context';

interface TopBarProps {
  onUserClick: () => void;
}

export function NavbarTopBar({ onUserClick }: TopBarProps) {
  const { itemCount } = useCart();
  const { user } = useAuth();

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex items-center gap-2">
      <Link
        href="/"
        className="flex h-[50px] shrink-0 items-center gap-2.5 rounded-full bg-white/70 px-5 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/90"
      >
        <IconStar size={20} className="text-black/82" />
        <span className="whitespace-nowrap text-base font-semibold tracking-tight text-black/80">
          MiTienda
        </span>
      </Link>

      <div className="flex flex-1 justify-center">
        <div className="h-[50px] w-full max-w-[440px] items-center rounded-full bg-white/70 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] focus-within:max-w-[540px] focus-within:bg-white/90 hidden md:flex">
          <div className="flex w-full items-center px-5">
            <Suspense fallback={
              <div className="flex items-center gap-2.5 text-sm text-black/28">
                <IconSearch size={15} />
                <span>Buscar productos, marcas, categorías…</span>
              </div>
            }>
              <SearchBar variant="pill" />
            </Suspense>
          </div>
        </div>
      </div>

      <Link
        href="/perfil"
        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] text-black/55 transition-all hover:bg-white/90 hover:scale-105 hidden md:flex"
        title="Lista de deseos"
      >
        <IconHeart size={19} />
      </Link>

      <Link
        href="/carrito"
        className="relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] text-black/55 transition-all hover:bg-white/90 hover:scale-105"
        title="Carrito"
      >
        <IconShoppingCart size={19} />
        {itemCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {itemCount}
          </span>
        )}
      </Link>

      <button
        onClick={onUserClick}
        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-white/70 backdrop-blur-3xl border border-black/[0.09] shadow-[0_2px_20px_rgba(0,0,0,0.07),0_0.5px_1px_rgba(0,0,0,0.05)] text-black/55 transition-all hover:bg-white/90 hover:scale-105"
        title={user ? 'Mi cuenta' : 'Iniciar sesión'}
      >
        <IconUser size={19} />
      </button>
    </div>
  );
}