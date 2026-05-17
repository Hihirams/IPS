'use client';

import { useState } from 'react';
import { AddressLabel } from '@ecommerce/types';

interface AddressFormProps {
  onSubmit: (address: {
    label: AddressLabel;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
  }) => void;
  onCancel?: () => void;
}

export function AddressForm({ onSubmit, onCancel }: AddressFormProps) {
  const [form, setForm] = useState({
    label: 'HOME' as AddressLabel,
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'MX',
    isDefault: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.street.trim()) newErrors.street = 'La calle es obligatoria';
    if (!form.city.trim()) newErrors.city = 'La ciudad es obligatoria';
    if (!form.state.trim()) newErrors.state = 'El estado es obligatorio';
    if (!form.zipCode.trim()) newErrors.zipCode = 'El código postal es obligatorio';
    if (!form.country.trim()) newErrors.country = 'El país es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(form);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-slate-900">Nueva Dirección</h3>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
        <select
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value as AddressLabel })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="HOME">Casa</option>
          <option value="OFFICE">Oficina</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Calle y número</label>
        <input
          type="text"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
          className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.street ? 'border-red-300' : 'border-slate-200'}`}
          placeholder="Av. Insurgentes Sur 1605"
        />
        {errors.street && <span className="text-xs text-red-600">{errors.street}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.city ? 'border-red-300' : 'border-slate-200'}`}
          />
          {errors.city && <span className="text-xs text-red-600">{errors.city}</span>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.state ? 'border-red-300' : 'border-slate-200'}`}
          />
          {errors.state && <span className="text-xs text-red-600">{errors.state}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Código Postal</label>
          <input
            type="text"
            value={form.zipCode}
            onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.zipCode ? 'border-red-300' : 'border-slate-200'}`}
          />
          {errors.zipCode && <span className="text-xs text-red-600">{errors.zipCode}</span>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">País</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.country ? 'border-red-300' : 'border-slate-200'}`}
          />
          {errors.country && <span className="text-xs text-red-600">{errors.country}</span>}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="rounded border-slate-300"
        />
        <span className="text-sm text-slate-700">Establecer como dirección principal</span>
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Guardar Dirección
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
