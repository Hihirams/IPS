'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { IconStar } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@ecommerce/ui';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, fetchCsrfToken } from '@/lib/csrf';
import type { SafeUser } from '@ecommerce/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const redirectTo = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function finishLogin(user: SafeUser) {
    login(user);
    await fetchCsrfToken();

    try {
      await apiFetch('/api/cart/merge', { method: 'POST' });
    } catch {
      // Sin carrito anónimo: continuar
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? 'Credenciales inválidas');
        return;
      }

      if (json.data?.mfaRequired) {
        setMfaToken(json.data.mfaToken);
        setMfaCode('');
        return;
      }

      const user = json.data.user as SafeUser;
      await finishLogin(user);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMFASubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mfaCode.length !== 6) {
      setError('Ingresa un código MFA de 6 dígitos.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mfaToken, code: mfaCode }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? 'Código MFA inválido.');
        return;
      }

      await finishLogin(json.data.user as SafeUser);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-panel animate-scale-in w-full max-w-md rounded-[28px] p-8">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink-1">
            <IconStar size={22} /> MiTienda
          </Link>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink-1">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-ink-2">
            ¿No tienes cuenta?{' '}
            <Link href="/registro" className="link-accent">
              Regístrate
            </Link>
          </p>
        </div>

        {mfaToken ? (
          <form onSubmit={handleMFASubmit} className="space-y-4">
            {error && (
              <div className="rounded-[14px] border border-red-500/20 bg-red-500/[0.08] p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="mfaCode" className="block text-sm font-medium text-ink-2">
                Código MFA
              </label>
              <input
                id="mfaCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="field mt-1 text-center text-2xl tracking-widest"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Verificar y entrar
            </Button>

            <button
              type="button"
              onClick={() => {
                setMfaToken('');
                setMfaCode('');
                setError('');
              }}
              className="w-full text-sm text-ink-3 transition hover:text-ink-1"
            >
              Usar otra cuenta
            </button>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field mt-1"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field mt-1"
            />
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Entrar
          </Button>
        </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-ink-3 transition hover:text-ink-1">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
