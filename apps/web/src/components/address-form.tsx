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
    <form onSubmit={handleSubmit} className="glass-card animate-fade-up space-y-4 rounded-[22px] p-6">
      <h3 className="text-lg font-semibold tracking-tight text-ink-1">Nueva dirección</h3>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">Tipo</label>
        <select
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value as AddressLabel })}
          className="field"
        >
          <option value="HOME">Casa</option>
          <option value="OFFICE">Oficina</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-2">Calle y número</label>
        <input
          type="text"
          value={form.street}
          onChange={(e) => setForm({ ...form, street: e.target.value })}
          className={`field ${errors.street ? '!border-red-400' : ''}`}
          placeholder="Av. Insurgentes Sur 1605"
        />
        {errors.street && <span className="text-xs text-red-500">{errors.street}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Ciudad</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className={`field ${errors.city ? '!border-red-400' : ''}`}
          />
          {errors.city && <span className="text-xs text-red-500">{errors.city}</span>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Estado</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className={`field ${errors.state ? '!border-red-400' : ''}`}
          />
          {errors.state && <span className="text-xs text-red-500">{errors.state}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">Código Postal</label>
          <input
            type="text"
            value={form.zipCode}
            onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
            className={`field ${errors.zipCode ? '!border-red-400' : ''}`}
          />
          {errors.zipCode && <span className="text-xs text-red-500">{errors.zipCode}</span>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-2">País</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className={`field ${errors.country ? '!border-red-400' : ''}`}
          />
          {errors.country && <span className="text-xs text-red-500">{errors.country}</span>}
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="h-4 w-4 rounded accent-[#0071e3]"
        />
        <span className="text-sm text-ink-2">Establecer como dirección principal</span>
      </label>

      <div className="flex gap-3 pt-1">
        <button type="submit" className="btn-primary flex-1 py-2.5">
          Guardar dirección
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
