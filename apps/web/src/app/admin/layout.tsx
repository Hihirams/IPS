'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from '@/components/admin-sidebar';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isLoading, isAdmin, mfaEnabled } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    // No autenticado → login
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // No es admin → tienda
    if (!isAdmin) {
      router.push('/');
      return;
    }

    // No tiene MFA y no está en la página de setup → setup MFA
    if (!mfaEnabled && pathname !== '/admin/setup-mfa') {
      router.push('/admin/setup-mfa');
      return;
    }
  }, [user, isLoading, isAdmin, mfaEnabled, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  // No renderizar nada si no está autenticado o no es admin
  if (!user || !isAdmin) {
    return null;
  }

  // Si no tiene MFA y no está en setup-mfa, no renderizar
  if (!mfaEnabled && pathname !== '/admin/setup-mfa') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="ml-64 p-8">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
