'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Address } from '@ecommerce/types';

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
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
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
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      <div className="mx-auto max-w-3xl py-8">
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis Direcciones</h1>
          <p className="mt-1 text-sm text-slate-600">
            Máximo 5 direcciones. {addresses.length}/5 usadas.
          </p>
        </div>
        <Link href="/perfil" className="text-sm text-slate-500 hover:text-slate-900">
          ← Volver al perfil
        </Link>
      </div>

      <div className="space-y-4">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`rounded-xl border p-6 ${address.isDefault ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900">
                    {address.label === 'HOME' ? 'Casa' : address.label === 'OFFICE' ? 'Oficina' : 'Otra'}
                  </span>
                  {address.isDefault && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600">{address.street}</p>
                <p className="text-sm text-slate-600">
                  {address.city}, {address.state} {address.zipCode}
                </p>
                <p className="text-sm text-slate-600">{address.country}</p>
              </div>
              <div className="flex flex-col gap-2">
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Hacer principal
                  </button>
                )}
                <button
                  onClick={() => startEdit(address)}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-800"
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-sm font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
          >
            + Agregar nueva dirección
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Editar dirección' : 'Nueva dirección'}
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tipo</label>
                <select
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value as 'HOME' | 'OFFICE' | 'OTHER' })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                >
                  <option value="HOME">Casa</option>
                  <option value="OFFICE">Oficina</option>
                  <option value="OTHER">Otra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Calle y número</label>
                <input
                  type="text"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Ciudad</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Estado</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">CP</label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">País</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Marcar como dirección principal</span>
              </label>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.street || !form.city || !form.state || !form.zipCode}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
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
