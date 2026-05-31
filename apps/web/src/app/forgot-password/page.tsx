'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconStar } from '@tabler/icons-react';
import { Button } from '@ecommerce/ui';

/**
 * Página "Olvidé mi contraseña".
 *
 * El usuario ingresa su email y se llama a POST /api/auth/forgot-password.
 * Por seguridad, el backend SIEMPRE responde igual (exista o no el email),
 * así que mostramos un mensaje genérico de confirmación.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? 'No se pudo procesar la solicitud.');
        return;
      }

      // Respuesta genérica: confirmamos sin revelar si el email existe.
      setSubmitted(true);
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
            Recuperar contraseña
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            Te enviaremos un enlace para crear una nueva contraseña.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-6">
            <div className="rounded-[14px] border border-green-500/20 bg-green-500/[0.08] p-4 text-sm text-green-700">
              Si el email está registrado, recibirás un enlace para restablecer tu
              contraseña en los próximos minutos. Revisa también tu carpeta de spam.
              El enlace caduca en 30 minutos.
            </div>
            <Link href="/login" className="block">
              <Button className="w-full" size="lg" variant="outline">
                Volver a iniciar sesión
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

            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Enviar enlace
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
