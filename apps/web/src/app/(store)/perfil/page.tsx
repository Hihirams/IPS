'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
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
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="mt-1 text-sm text-slate-600">Gestiona tu información personal</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-slate-900">{profile?.email}</span>
              {profile?.isEmailVerified ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Verificado
                </span>
              ) : (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                  No verificado
                </span>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-slate-900">{profile?.name ?? 'Sin nombre'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+521234567890"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-slate-900">{profile?.phone ?? 'Sin teléfono'}</p>
            )}
          </div>

          {/* MFA Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Autenticación de dos factores</label>
            <div className="mt-1">
              {profile?.mfaEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  Activada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Desactivada
                </span>
              )}
            </div>
          </div>

          {/* Member since */}
          <div>
            <label className="block text-sm font-medium text-slate-700">Miembro desde</label>
            <p className="mt-1 text-slate-900">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString('es-MX')
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-4">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Editar perfil
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/perfil/pedidos"
          className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300"
        >
          <h3 className="font-semibold text-slate-900">Mis Pedidos</h3>
          <p className="mt-1 text-sm text-slate-500">Ver historial de compras</p>
        </Link>
        <Link
          href="/perfil/direcciones"
          className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300"
        >
          <h3 className="font-semibold text-slate-900">Direcciones</h3>
          <p className="mt-1 text-sm text-slate-500">Gestionar direcciones de envío</p>
        </Link>
        <Link
          href="/perfil/seguridad"
          className="rounded-xl border border-slate-200 bg-white p-6 hover:border-slate-300"
        >
          <h3 className="font-semibold text-slate-900">Seguridad</h3>
          <p className="mt-1 text-sm text-slate-500">Contraseña, sesiones y 2FA</p>
        </Link>
      </div>
    </div>
  );
}
