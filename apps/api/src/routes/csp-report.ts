import type { FastifyInstance } from 'fastify';

/**
 * Endpoint para recibir reportes de violaciones de CSP.
 * Browsers envían automáticamente reportes cuando una política CSP-Report-Only es violada.
 *
 * SECURITY:
 * - Solo acepta POST requests.
 * - Sanitiza el input antes de loguear.
 * - No devuelve información sensible.
 * - Rate limit implícito: Fastify global rate limit.
 */

export async function cspReportRoutes(app: FastifyInstance) {
  app.post('/api/csp-report', async (request, reply) => {
    try {
      const report = request.body as {
        'csp-report'?: {
          'document-uri'?: string;
          'referrer'?: string;
          'violated-directive'?: string;
          'effective-directive'?: string;
          'original-policy'?: string;
          'blocked-uri'?: string;
          'line-number'?: number;
          'source-file'?: string;
          'script-sample'?: string;
        };
      };

      const cspReport = report?.['csp-report'];

      if (!cspReport) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_REPORT', message: 'Formato de reporte inválido.' },
        });
      }

      // Sanitizar y loguear la violación (sin datos sensibles)
      app.log.warn(
        {
          action: 'CSP_VIOLATION',
          documentUri: cspReport['document-uri']?.substring(0, 500),
          violatedDirective: cspReport['violated-directive']?.substring(0, 200),
          effectiveDirective: cspReport['effective-directive']?.substring(0, 200),
          blockedUri: cspReport['blocked-uri']?.substring(0, 500),
          sourceFile: cspReport['source-file']?.substring(0, 500),
          lineNumber: cspReport['line-number'],
          ip: request.ip,
        },
        'CSP violation detected'
      );

      // Si la violación es en script-src y el blocked-uri no es de Stripe ni self,
      // podría ser un intento de Magecart → alerta de seguridad
      if (
        cspReport['effective-directive'] === 'script-src' &&
        cspReport['blocked-uri'] &&
        !cspReport['blocked-uri'].startsWith('self') &&
        !cspReport['blocked-uri'].includes('stripe.com') &&
        cspReport['blocked-uri'] !== 'inline'
      ) {
        app.log.error(
          {
            action: 'CSP_MALICIOUS_SCRIPT',
            blockedUri: cspReport['blocked-uri'],
            ip: request.ip,
          },
          'Posible script malicioso bloqueado por CSP'
        );
      }

      return reply.status(204).send();
    } catch {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_REPORT', message: 'No se pudo procesar el reporte.' },
      });
    }
  });
}
