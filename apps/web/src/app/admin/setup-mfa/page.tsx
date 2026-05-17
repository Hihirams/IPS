'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AdminSetupMFAPage() {
  const router = useRouter();
  const { user, mfaEnabled, refreshUser } = useAuth();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify'>('setup');

  useEffect(() => {
    if (mfaEnabled) {
      router.push('/admin');
      return;
    }
    generateMFA();
  }, [mfaEnabled, router]);

  async function generateMFA() {
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setQrCode(json.data.qrCodeUrl);
        setSecret(json.data.secret);
        setStep('setup');
      }
    } catch {
      setError('Error al generar MFA. Intenta de nuevo.');
    }
  }

  async function verifyAndEnable() {
    if (!code || code.length !== 6) {
      setError('Ingresa un código de 6 dígitos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      const json = await res.json();

      if (json.success) {
        await refreshUser();
        router.push('/admin');
      } else {
        setError(json.error?.message ?? 'Código inválido. Intenta de nuevo.');
      }
    } catch {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Configurar MFA</h1>
          <p className="mt-2 text-sm text-slate-600">
            Se requiere autenticación de dos factores para acceder al panel de administración.
          </p>
        </div>

        {step === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="mb-4 text-sm text-slate-600">
                Escanea este código QR con Google Authenticator o cualquier app de autenticación:
              </p>
              {qrCode && (
                <img
                  src={qrCode}
                  alt="Código QR para MFA"
                  className="mx-auto h-48 w-48"
                />
              )}
              <p className="mt-4 text-xs text-slate-500">
                O ingresa manualmente: <code className="rounded bg-slate-100 px-2 py-1">{secret}</code>
              </p>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Ya escaneé el código →
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Código de verificación (6 dígitos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl tracking-widest focus:border-slate-900 focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('setup')}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Atrás
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={loading || code.length !== 6}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Activar MFA'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
