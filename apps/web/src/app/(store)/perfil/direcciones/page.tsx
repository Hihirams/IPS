'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Address } from '@ecommerce/types';
import { apiFetch } from '@/lib/csrf';

export default function UserAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: 'HOME' as 'HOME' | 'OFFICE' | 'OTHER',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'MX',
    isDefault: false,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  async function loadAddresses() {
    setLoading(true);

    try {
      const res = await fetch('/api/user/addresses', {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setAddresses(json.data);
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    const url = editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses';
    const method = editingId ? 'PATCH' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setEditingId(null);
        resetForm();
        await loadAddresses();
      } else {
        alert(json.error?.message ?? 'Error al guardar dirección');
      }
    } catch {
      alert('Error de red. Intenta de nuevo.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta dirección?')) return;

    try {
      const res = await apiFetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadAddresses();
      }
    } catch {
      // Ignorar
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await apiFetch(`/api/user/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        await loadAddresses();
      }
    } catch {
      // Ignorar
    }
  }

  function resetForm() {
    setForm({
      label: 'HOME',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'MX',
      isDefault: false,
    });
  }

  function startEdit(address: Address) {
    setForm({
      label: address.label,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    setEditingId(address.id);
    setShowModal(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-black/10 border-t-black/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="animate-fade-up mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-1">Mis direcciones</h1>
          <p className="mt-1 text-sm text-ink-2">
            Máximo 5 direcciones. {addresses.length}/5 usadas.
          </p>
        </div>
        <Link href="/perfil" className="text-sm text-ink-3 transition hover:text-ink-1">
          ← Volver al perfil
        </Link>
      </div>

      <div className="space-y-4">
        {addresses.map((address, i) => (
          <div
            key={address.id}
            className={`animate-fade-up delay-${Math.min(i, 8)} rounded-[22px] p-6 ${address.isDefault ? 'border border-black/25 bg-black/[0.03] shadow-[var(--shadow-sm)]' : 'glass-card'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink-1">
                    {address.label === 'HOME' ? 'Casa' : address.label === 'OFFICE' ? 'Oficina' : 'Otra'}
                  </span>
                  {address.isDefault && (
                    <span className="rounded-full bg-black/[0.88] px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-2">{address.street}</p>
                <p className="text-sm text-ink-2">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p className="text-sm text-ink-2">{address.country}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="rounded-full px-2.5 py-1 text-sm font-medium text-ink-2 transition hover:bg-black/[0.05] hover:text-ink-1"
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  onClick={() => startEdit(address)}
                  className="rounded-full px-2.5 py-1 text-sm font-medium text-ink-2 transition hover:bg-black/[0.05] hover:text-ink-1"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="rounded-full px-2.5 py-1 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}

        {addresses.length < 5 && (
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/15 p-6 text-sm font-medium text-ink-2 transition hover:border-black/25 hover:text-ink-1"
          >
            + Agregar nueva dirección
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="glass-solid animate-scale-in w-full max-w-md rounded-[24px] p-6">
            <h3 className="text-lg font-semibold tracking-tight text-ink-1">
              {editingId ? 'Editar dirección' : 'Nueva dirección'}
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-2">Tipo</label>
                <select
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value as 'HOME' | 'OFFICE' | 'OTHER' })}
                  className="field mt-1"
                >
                  <option value="HOME">Casa</option>
                  <option value="OFFICE">Oficina</option>
                  <option value="OTHER">Otra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2">Calle y número</label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-2">Ciudad</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-2">Estado</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="field mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-2">CP</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="field mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-2">País</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="field mt-1"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded accent-[#0071e3]"
                />
                <span className="text-sm text-ink-2">Marcar como dirección principal</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary flex-1 py-2.5"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.street || !form.city || !form.state || !form.zipCode}
                className="btn-primary flex-1 py-2.5"
              >
                {editingId ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
