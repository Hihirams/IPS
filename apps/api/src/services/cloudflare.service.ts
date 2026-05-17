interface CloudflareError {
  message: string;
  code?: number;
}

/**
 * Servicio de integración con Cloudflare API.
 * Permite bloquear/desbloquear IPs vía Zone Lockdown y Managed Rules.
 *
 * SECURITY: Usa CLOUDFLARE_API_TOKEN con scope mínimo (Zone:Read, Zone:Edit).
 * Nunca loguear el token completo.
 */

const API_BASE = 'https://api.cloudflare.com/client/v4';

function getHeaders() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    throw new Error('CLOUDFLARE_API_TOKEN no está configurado');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getZoneId(): string {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) {
    throw new Error('CLOUDFLARE_ZONE_ID no está configurado');
  }
  return zoneId;
}

/**
 * Bloquea una IP en Cloudflare WAF por un tiempo determinado.
 * Usa un firewall rule dinámico para bloquear la IP específica.
 */
export async function blockIp(ip: string, durationMinutes: number = 60): Promise<void> {
  const zoneId = getZoneId();

  // Crear un firewall rule para bloquear la IP
  // Nota: en producción con cuenta Business/Enterprise se puede usar:
  // 1. Zone Lockdown (más restrictivo)
  // 2. WAF Custom Rules (más flexible)
  // 3. IP Access Rules (recomendado para este caso)

  const url = `${API_BASE}/zones/${zoneId}/firewall/access_rules/rules`;

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      mode: 'block',
      configuration: {
        target: 'ip',
        value: ip,
      },
      notes: `Auto-blocked by security monitoring. Duration: ${durationMinutes}m.`,
    }),
  });

  if (!res.ok) {
    const error = (await res.json()) as { success: boolean; errors: CloudflareError[] };
    // Si la regla ya existe, ignorar el error
    if (error.errors?.some((e) => e.code === 10009)) {
      return; // Already exists
    }
    throw new Error(`Cloudflare blockIp failed: ${error.errors?.[0]?.message ?? res.statusText}`);
  }

  // Programar desbloqueo automático después de durationMinutes
  // En producción esto debería usar un job queue (BullMQ, etc.)
  // Por ahora, logueamos que debe desbloquearse manualmente o con cron
}

/**
 * Desbloquea una IP en Cloudflare WAF.
 */
export async function unblockIp(ip: string): Promise<void> {
  const zoneId = getZoneId();

  // Buscar la regla de acceso por IP
  const listUrl = `${API_BASE}/zones/${zoneId}/firewall/access_rules/rules?configuration.target=ip&configuration.value=${encodeURIComponent(ip)}`;

  const listRes = await fetch(listUrl, { headers: getHeaders() });
  if (!listRes.ok) {
    throw new Error(`Cloudflare unblockIp list failed: ${listRes.statusText}`);
  }

  const listData = (await listRes.json()) as {
    success: boolean;
    result: Array<{ id: string }>;
  };

  if (!listData.success || !listData.result.length) {
    return; // No rule found, nothing to unblock
  }

  // Eliminar la regla
  for (const rule of listData.result) {
    const deleteUrl = `${API_BASE}/zones/${zoneId}/firewall/access_rules/rules/${rule.id}`;
    const deleteRes = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    if (!deleteRes.ok) {
      const error = (await deleteRes.json()) as { success: boolean; errors: CloudflareError[] };
      throw new Error(`Cloudflare unblockIp delete failed: ${error.errors?.[0]?.message ?? deleteRes.statusText}`);
    }
  }
}

/**
 * Verifica si una IP está bloqueada en Cloudflare.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const zoneId = getZoneId();
  const url = `${API_BASE}/zones/${zoneId}/firewall/access_rules/rules?configuration.target=ip&configuration.value=${encodeURIComponent(ip)}`;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) return false;

  const data = (await res.json()) as { success: boolean; result: unknown[] };
  return data.success && data.result.length > 0;
}
