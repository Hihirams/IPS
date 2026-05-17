'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@ecommerce/ui';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, fetchCsrfToken } from '@/lib/csrf';
import type { SafeUser } from '@ecommerce/types';

const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!PASSWORD_REGEX.uppercase.test(password)) {
    return 'Debe contener al menos una mayúscula';
  }
  if (!PASSWORD_REGEX.number.test(password)) {
    return 'Debe contener al menos un número';
  }
  if (!PASSWORD_REGEX.special.test(password)) {
    return 'Debe contener al menos un carácter especial';
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFieldErrors({ password: passwordError });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        if (json.error?.details?.length) {
          const errors: Record<string, string> = {};
          for (const d of json.error.details) {
            errors[d.path] = d.message;
          }
          setFieldErrors(errors);
        } else {
          setError(json.error?.message ?? 'No se pudo completar el registro');
        }
        return;
      }

      const user = json.data.user as SafeUser;
      login(user);
      await fetchCsrfToken();

      try {
        await apiFetch('/api/cart/merge', { method: 'POST' });
      } catch {
        // Sin carrito anónimo: continuar
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
            Ecommerce Tech
          </Link>
          <h1 className="mt-6 text-xl font-semibold text-slate-900">Crear cuenta</h1>
          <p className="mt-2 text-sm text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-medium text-slate-900 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Nombre (opcional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Mín. 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
            Registrarse
          </Button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
            ← Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
}