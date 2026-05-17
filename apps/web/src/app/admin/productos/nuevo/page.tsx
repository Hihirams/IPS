'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { apiFetch } from '@/lib/csrf';
import type { Brand, Category } from '@ecommerce/types';

const ProductSchema = z.object({
  sku: z.string().min(1, 'SKU requerido').max(100),
  name: z.string().min(1, 'Nombre requerido').max(200),
  description: z.string().min(1, 'Descripción requerida').max(5000),
  price: z.coerce.number().positive('Precio debe ser positivo'),
  comparePrice: z.coerce.number().positive().optional().nullable(),
  cost: z.coerce.number().positive('Costo debe ser positivo'),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  categoryId: z.string().min(1, 'Categoría requerida'),
  brandId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

interface SpecEntry {
  key: string;
  value: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    cost: '',
    stock: '0',
    lowStockThreshold: '5',
    categoryId: '',
    brandId: '',
    isActive: true,
    isFeatured: false,
  });
  const [specs, setSpecs] = useState<SpecEntry[]>([{ key: '', value: '' }]);
  const [images, setImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        fetch('/api/categories', { credentials: 'include' }),
        fetch('/api/brands', { credentials: 'include' }),
      ]);
      const [categoriesJson, brandsJson] = await Promise.all([
        categoriesRes.json(),
        brandsRes.json(),
      ]);

      if (categoriesJson.success) {
        const list = categoriesJson.data ?? [];
        setCategories(list);
        setForm((current) => current.categoryId || !list[0]
          ? current
          : { ...current, categoryId: list[0].id });
      }

      if (brandsJson.success) {
        setBrands(brandsJson.data ?? []);
      }
    } catch {
      // Las validaciones del formulario mostrarán si falta categoría.
    }
  }

  const addSpec = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index));
  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...specs];
    const spec = newSpecs[index];
    if (!spec) return;
    spec[field] = value;
    setSpecs(newSpecs);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (images.length >= 5) break;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const res = await apiFetch('/api/admin/upload/image', {
            method: 'POST',
            body: JSON.stringify({
              image: base64,
              filename: file.name,
              mimeType: file.type,
            }),
          });
          const json = await res.json();
          if (json.success) {
            setImages((prev) => [...prev, json.data.url]);
          }
        } catch {
          // Ignorar error de subida
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);

    const validation = ProductSchema.safeParse({
      ...form,
      price: parseFloat(form.price),
      comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
      cost: parseFloat(form.cost),
      stock: parseInt(form.stock),
      lowStockThreshold: parseInt(form.lowStockThreshold),
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      setSaving(false);
      return;
    }

    const specsObj = Object.fromEntries(
      specs.filter((s) => s.key && s.value).map((s) => [s.key, s.value])
    );

    try {
      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          ...validation.data,
          brandId: validation.data.brandId || null,
          description: form.description,
          specs: specsObj,
          images: images.length > 0 ? images : ['https://res.cloudinary.com/demo/image/upload/sample'],
        }),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/admin/productos');
      } else {
        setErrors({ submit: json.error?.message ?? 'Error al crear producto' });
      }
    } catch {
      setErrors({ submit: 'Error de red. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push('/admin/productos')}
          className="mb-2 text-sm text-slate-500 hover:text-slate-900"
        >
          ← Volver a productos
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo producto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Basic Info */}
          <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900">Información básica</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              {form.name && (
                <p className="mt-1 text-xs text-slate-500">
                  Slug: {generateSlug(form.name)}
                </p>
              )}
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
                {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Precio comparativo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.comparePrice}
                  onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Costo</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
                {errors.cost && <p className="mt-1 text-xs text-red-600">{errors.cost}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
                {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Stock bajo threshold</label>
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Marca</label>
              <select
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              >
                <option value="">Sin marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Activo</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Destacado</span>
              </label>
            </div>
          </div>

          {/* Specs & Images */}
          <div className="space-y-6">
            {/* Images */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Imágenes</h2>
              <p className="text-xs text-slate-500">Máximo 5 imágenes. Arrastra o selecciona archivos.</p>

              <div className="mt-4">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img} alt="" className="h-full w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Specs */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Especificaciones técnicas</h2>
                <button
                  type="button"
                  onClick={addSpec}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                >
                  + Agregar
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {specs.map((spec, i) => (
                  <div key={i} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Característica"
                      value={spec.key}
                      onChange={(e) => updateSpec(i, 'key', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Valor"
                      value={spec.value}
                      onChange={(e) => updateSpec(i, 'value', e.target.value)}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpec(i)}
                      className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {errors.submit && (
          <p className="text-sm text-red-600">{errors.submit}</p>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin/productos')}
            className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Crear producto'}
          </button>
        </div>
      </form>
    </div>
  );
}
