'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/csrf';

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
      const res = await apiFetch('/api/user/change-password', {
        method: 'POST',
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
      const res = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
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
      const res = await apiFetch('/api/user/sessions', {
        method: 'DELETE',
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
      const res = await apiFetch(url, {
        method: 'POST',
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
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="animate-fade-up mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-1">Seguridad</h1>
        <Link href="/perfil" className="mt-1 inline-block text-sm text-ink-3 transition hover:text-ink-1">
          ← Volver al perfil
        </Link>
      </div>

      <div className="space-y-8">
        {/* Change Password */}
        <div className="glass-card animate-fade-up rounded-[22px] p-6">
          <h2 className="text-lg font-semibold tracking-tight text-ink-1">Cambiar contraseña</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-2">Contraseña actual</label>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="field mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2">Nueva contraseña</label>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="field mt-1"
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="field mt-1"
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
              )}
            </div>
            {passwordErrors.submit && (
              <p className="text-sm text-red-500">{passwordErrors.submit}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="btn-primary px-5 py-2.5"
            >
              {changingPassword ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="glass-card animate-fade-up delay-1 rounded-[22px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-ink-1">Sesiones activas</h2>
            <button
              onClick={revokeAllOtherSessions}
              className="rounded-full px-2.5 py-1 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
            >
              Cerrar todas las demás
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-[16px] border border-[color:var(--hair)] p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-1">
                      {parseDeviceInfo(session.deviceInfo)}
                    </span>
                    {session.isCurrent && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Actual
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-3">IP: {session.ipAddress ?? 'Desconocida'}</p>
                  <p className="text-xs text-ink-4">
                    {new Date(session.createdAt).toLocaleString('es-MX')}
                  </p>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => revokeSession(session.id)}
                    className="rounded-full px-2.5 py-1 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 2FA */}
        <div className="glass-card animate-fade-up delay-2 rounded-[22px] p-6">
          <h2 className="text-lg font-semibold tracking-tight text-ink-1">Autenticación de dos factores (2FA)</h2>
          <div className="mt-4">
            {user?.mfaEnabled ? (
              <div>
                <p className="text-sm text-ink-2">
                  El 2FA está <strong>activado</strong>. Se requiere código de verificación en cada inicio de sesión.
                </p>
                <button
                  onClick={() => setMfaAction('disable')}
                  className="btn-secondary mt-4 px-5 py-2.5"
                >
                  Desactivar 2FA
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-ink-2">
                  El 2FA está <strong>desactivado</strong>. Actívalo para mayor seguridad.
                </p>
                <button
                  onClick={() => setMfaAction('enable')}
                  className="btn-primary mt-4 px-5 py-2.5"
                >
                  Activar 2FA
                </button>
              </div>
            )}
          </div>

          {mfaAction && (
            <div className="animate-fade-in mt-4 rounded-[16px] bg-black/[0.03] p-4">
              <label className="block text-sm font-medium text-ink-2">
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
                  className="field flex-1 text-center text-lg tracking-widest"
                />
                <button
                  onClick={() => handleMFA(mfaAction)}
                  disabled={mfaCode.length !== 6 || mfaLoading}
                  className="btn-primary px-5 py-2.5"
                >
                  {mfaLoading ? 'Verificando…' : mfaAction === 'enable' ? 'Activar' : 'Desactivar'}
                </button>
              </div>
              <button
                onClick={() => { setMfaAction(null); setMfaCode(''); }}
                className="mt-2 text-sm text-ink-3 transition hover:text-ink-1"
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
