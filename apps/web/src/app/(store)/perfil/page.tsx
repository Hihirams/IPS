'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/csrf';

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<{
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    isEmailVerified: boolean;
    mfaEnabled: boolean;
    createdAt: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setForm({ name: json.data.name ?? '', phone: json.data.phone ?? '' });
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);

    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name || undefined,
          phone: form.phone || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setProfile(json.data);
        setEditing(false);
        await refreshUser();
      }
    } catch {
      // Ignorar
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="animate-fade-up mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-1">Mi perfil</h1>
        <p className="mt-1 text-sm text-ink-2">Gestiona tu información personal</p>
      </div>

      <div className="glass-card animate-fade-up rounded-[22px] p-6">
        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-ink-2">Email</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-ink-1">{profile?.email}</span>
              {profile?.isEmailVerified ? (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Verificado
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                  No verificado
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-ink-2">Nombre</label>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field mt-1"
              />
            ) : (
              <p className="mt-1 text-ink-1">{profile?.name ?? 'Sin nombre'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-ink-2">Teléfono</label>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+521234567890"
                className="field mt-1"
              />
            ) : (
              <p className="mt-1 text-ink-1">{profile?.phone ?? 'Sin teléfono'}</p>
            )}
          </div>

          {/* MFA Status */}
          <div>
            <label className="block text-sm font-medium text-ink-2">Autenticación de dos factores</label>
            <div className="mt-1">
              {profile?.mfaEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Activada
                </span>
              ) : (
                <span className="chip">Desactivada</span>
              )}
            </div>
          </div>

          {/* Member since */}
          <div>
            <label className="block text-sm font-medium text-ink-2">Miembro desde</label>
            <p className="mt-1 text-ink-1">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('es-MX')
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2.5">
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditing(false)} className="btn-secondary px-5 py-2.5">
                Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-primary px-5 py-2.5">
              Editar perfil
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/perfil/pedidos" className="glass-interactive animate-fade-up delay-1 rounded-[22px] p-6">
          <h3 className="font-semibold text-ink-1">Mis pedidos</h3>
          <p className="mt-1 text-sm text-ink-3">Ver historial de compras</p>
        </Link>
        <Link href="/perfil/direcciones" className="glass-interactive animate-fade-up delay-2 rounded-[22px] p-6">
          <h3 className="font-semibold text-ink-1">Direcciones</h3>
          <p className="mt-1 text-sm text-ink-3">Gestionar direcciones de envío</p>
        </Link>
        <Link href="/perfil/seguridad" className="glass-interactive animate-fade-up delay-3 rounded-[22px] p-6">
          <h3 className="font-semibold text-ink-1">Seguridad</h3>
          <p className="mt-1 text-sm text-ink-3">Contraseña, sesiones y 2FA</p>
        </Link>
      </div>
    </div>
  );
}
