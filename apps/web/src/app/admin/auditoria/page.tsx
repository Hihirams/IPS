'use client';

import { useState, useEffect } from 'react';
import type { AdminAuditLog } from '@ecommerce/types';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  async function loadLogs() {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/audit-log?page=${page}&pageSize=20`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotalPages(json.meta.totalPages);
      }
    } catch {
      // Ignorar
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Admin</th>
                <th className="px-6 py-3 font-medium">Acción</th>
                <th className="px-6 py-3 font-medium">Entidad</th>
                <th className="px-6 py-3 font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Cargando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No hay registros.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-900">
                        {'admin' in log && typeof log.admin === 'object' && log.admin !== null
                          ? (log.admin as { email?: string }).email ?? 'Admin'
                          : 'Admin'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{log.entityType}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.entityId.slice(0, 8)}...</td>
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
    </div>
  );
}
