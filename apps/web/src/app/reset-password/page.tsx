'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { IconStar } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@ecommerce/ui';

/**
 * Página "Restablecer contraseña".
 *
 * Toma el `token` del query string (?token=...) que llegó por email y, junto con
 * la nueva contraseña, llama a POST /api/auth/reset-password.
 * El token es de un solo uso y caduca en 30 minutos (validado en el backend).
 */

// Mismas reglas que el backend (auth.schema.ts). El backend es la fuente de verdad;
// esto solo da feedback inmediato al usuario.
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[A-Z]/.test(pw)) return 'Debe contener al menos una mayúscula.';
  if (!/[0-9]/.test(pw)) return 'Debe contener al menos un número.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Debe contener al menos un carácter especial.';
  return null;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Falta el token de recuperación. Abre el enlace desde tu correo.');
      return;
    }

    const pwError = validatePassword(password);
    if (pwError) {
      setError(pwError);
      return;
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(
          json.error?.message ?? 'El enlace es inválido o ha expirado. Solicita uno nuevo.'
        );
        return;
      }

      setSuccess(true);
      // Redirigir al login tras unos segundos.
      setTimeout(() => {
        router.push('/login');
      }, 2500);
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
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink-1"
          >
            <IconStar size={22} /> MiTienda
          </Link>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-ink-1">
            Nueva contraseña
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            Elige una contraseña segura para tu cuenta.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="rounded-[14px] border border-green-500/20 bg-green-500/[0.08] p-4 text-sm text-green-700">
              Tu contraseña se actualizó correctamente. Por seguridad, cerramos tus otras
              sesiones. Te llevamos a iniciar sesión…
            </div>
            <Link href="/login" className="block">
              <Button className="w-full" size="lg">
                Ir a iniciar sesión
              </Button>
            </Link>
          </div>
        ) : !token ? (
          <div className="space-y-6">
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Este enlace no es válido porque falta el token. Solicita uno nuevo desde
              &quot;Recuperar contraseña&quot;.
            </div>
            <Link href="/forgot-password" className="block">
              <Button className="w-full" size="lg" variant="outline">
                Solicitar nuevo enlace
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-2">
                Nueva contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-1"
              />
              <p className="mt-1 text-xs text-ink-3">
                Mínimo 8 caracteres, con una mayúscula, un número y un carácter especial.
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-ink-2">
                Repetir contraseña
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="field mt-1"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Cambiar contraseña
            </Button>
          </form>
        )}

        <p className="mt-6 text-center">
          <Link href="/login" className="text-sm text-ink-3 transition hover:text-ink-1">
            ← Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
