'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/csrf';
import type { AdminUserListItem } from '@ecommerce/types';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [search, page]);

  async function loadUsers() {
    setLoading(true);

    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('pageSize', '20');
    if (search) params.set('search', search);

    try {
      const res = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setTotalPages(json.meta.totalPages);
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  async function handleBan() {
    if (!banningUser || !banReason.trim()) return;

    try {
      const res = await apiFetch(`/api/admin/users/${banningUser}/ban`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: banReason }),
      });
      const json = await res.json();
      if (json.success) {
        setShowBanModal(false);
        setBanReason('');
        setBanningUser(null);
        await loadUsers();
      }
    } catch {
      // Ignorar
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
      </div>

      <input
        type="text"
        placeholder="Buscar por email o nombre..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Rol</th>
                <th className="px-6 py-3 font-medium">MFA</th>
                <th className="px-6 py-3 font-medium">Pedidos</th>
                <th className="px-6 py-3 font-medium">Registro</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No hay usuarios.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className={user.isBanned ? 'bg-red-50' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{user.email}</span>
                        {user.name && <span className="text-xs text-slate-500">{user.name}</span>}
                        {user.isBanned && <span className="mt-1 inline-flex w-fit rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Baneado</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.mfaEnabled ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{user.orderCount}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4">
                      {!user.isBanned && (
                        <button
                          onClick={() => {
                            setBanningUser(user.id);
                            setShowBanModal(true);
                          }}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Banear
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">← Anterior</button>
          <span className="text-sm text-slate-500">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50">Siguiente →</button>
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <h3 className="text-lg font-bold text-slate-900">Banear usuario</h3>
            <p className="mt-1 text-sm text-slate-500">Esta acción revocará todas las sesiones activas del usuario.</p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Razón del baneo..."
              rows={3}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowBanModal(false)} className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={handleBan} disabled={!banReason.trim()} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">Banear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
