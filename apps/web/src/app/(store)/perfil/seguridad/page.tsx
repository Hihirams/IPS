'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function UserSecurityPage() {
  const { user, refreshUser } = useAuth();
  const [sessions, setSessions] = useState<
    Array<{
      id: string;
      deviceInfo: string | null;
      ipAddress: string | null;
      createdAt: string;
      isCurrent: boolean;
    }>
  >([]);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaAction, setMfaAction] = useState<'enable' | 'disable' | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const res = await fetch('/api/user/sessions', {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      }
    } catch {
      // Ignorar
    }
  }

  async function handleChangePassword() {
    setPasswordErrors({});

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrors({ confirmPassword: 'Las contraseñas no coinciden.' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordErrors({ newPassword: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const json = await res.json();

      if (json.success) {
        alert('Contraseña cambiada exitosamente. Tus otras sesiones han sido cerradas.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordErrors({ submit: json.error?.message ?? 'Error al cambiar contraseña' });
      }
    } catch {
      setPasswordErrors({ submit: 'Error de red. Intenta de nuevo.' });
    } finally {
      setChangingPassword(false);
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      const res = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadSessions();
      }
    } catch {
      // Ignorar
    }
  }

  async function revokeAllOtherSessions() {
    if (!confirm('¿Cerrar todas las demás sesiones? Tendrás que iniciar sesión nuevamente en otros dispositivos.')) return;

    try {
      const res = await fetch('/api/user/sessions', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await loadSessions();
        alert('Todas las demás sesiones han sido cerradas.');
      }
    } catch {
      // Ignorar
    }
  }

  async function handleMFA(action: 'enable' | 'disable') {
    setMfaLoading(true);

    try {
      const url = action === 'enable' ? '/api/auth/mfa/enable' : '/api/auth/mfa/disable';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ code: mfaCode }),
      });
      const json = await res.json();

      if (json.success) {
        await refreshUser();
        setMfaAction(null);
        setMfaCode('');
        alert(action === 'enable' ? '2FA activado exitosamente.' : '2FA desactivado.');
      } else {
        alert(json.error?.message ?? 'Código inválido.');
      }
    } catch {
      alert('Error de red. Intenta de nuevo.');
    } finally {
      setMfaLoading(false);
    }
  }

  function parseDeviceInfo(userAgent: string | null): string {
    if (!userAgent) return 'Dispositivo desconocido';
    if (userAgent.includes('Mobile')) return 'Móvil';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Navegador web';
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Seguridad</h1>
        <Link href="/perfil" className="mt-1 text-sm text-slate-500 hover:text-slate-900">
          ← Volver al perfil
        </Link>
      </div>

      <div className="space-y-8">
        {/* Change Password */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña actual</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Nueva contraseña</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            {passwordErrors.submit && (
              <p className="text-sm text-red-600">{passwordErrors.submit}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Sesiones activas</h2>
            <button
              onClick={revokeAllOtherSessions}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Cerrar todas las demás
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {parseDeviceInfo(session.deviceInfo)}
                    </span>
                    {session.isCurrent && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">IP: {session.ipAddress ?? 'Desconocida'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(session.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-800"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2FA */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Autenticación de dos factores (2FA)</h2>
          <div className="mt-4">
            {user?.mfaEnabled ? (
              <div>
                <p className="text-sm text-slate-600">
                  El 2FA está <strong>activado</strong>. Se requiere código de verificación en cada inicio de sesión.
                </p>
                <button
                  onClick={() => setMfaAction('disable')}
                  className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Desactivar 2FA
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600">
                  El 2FA está <strong>desactivado</strong>. Actívalo para mayor seguridad.
                </p>
                <button
                  onClick={() => setMfaAction('enable')}
                  className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Activar 2FA
                </button>
              </div>
            )}
          </div>

          {mfaAction && (
            <div className="mt-4 rounded-lg bg-slate-50 p-4">
              <label className="block text-sm font-medium text-slate-700">
                Código de verificación (6 dígitos)
              </label>
              <div className="mt-2 flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-slate-900 focus:outline-none"
                />
                <button
                  onClick={() => handleMFA(mfaAction)}
                  disabled={mfaCode.length !== 6 || mfaLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {mfaLoading ? 'Verificando...' : mfaAction === 'enable' ? 'Activar' : 'Desactivar'}
                </button>
              </div>
              <button
                onClick={() => { setMfaAction(null); setMfaCode(''); }}
                className="mt-2 text-sm text-slate-500 hover:text-slate-900"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
