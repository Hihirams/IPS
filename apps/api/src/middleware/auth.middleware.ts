import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * Usuario autenticado adjunto a la request.
 * El tipo se declara en src/types/fastify.d.ts via FastifyJWT merging.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  sessionId?: string;
}

/**
 * Middleware: verifica el access token.
 *
 * SECURITY FIX:
 * - Antes: solo leía de Authorization header (requería localStorage en frontend)
 * - Ahora: lee primero de cookie httpOnly `accessToken`, luego de header (backward compatible)
 * - Además: verifica que la sesión no esté revocada en DB
 */
export const authenticate: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    // 1. Obtener token: cookie httpOnly primero, luego header (backward compat)
    let token: string | undefined;

    if (request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7); // Remove "Bearer "
      }
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Se requiere un token de acceso válido.',
        },
      });
    }

    // 2. Verificar firma y extraer payload
    const payload = await request.server.jwt.verify<{
      sub: string;
      email: string;
      role: Role;
      sessionId?: string;
    }>(token);

    // 3. Verificar que la sesión no esté revocada (security hardening)
    if (payload.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId },
        select: { revokedAt: true },
      });
      if (session?.revokedAt) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'SESSION_REVOKED',
            message: 'La sesión ha sido revocada. Por favor inicia sesión nuevamente.',
          },
        });
      }
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido o expirado.',
      },
    });
  }
};

/**
 * Middleware: requiere que el usuario autenticado sea ADMIN.
 * Debe usarse DESPUÉS de `authenticate`.
 */
export const requireAdmin: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Se requiere autenticación.',
      },
    });
  }

  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'No tienes permisos para realizar esta acción.',
      },
    });
  }
};

/**
 * Middleware: intenta autenticar pero no falla si no hay token.
 * Útil para endpoints donde el usuario puede estar logueado o no (carrito anónimo).
 * SECURITY FIX: Lee accessToken de cookie httpOnly primero, luego header.
 */
export const optionalAuth: preHandlerHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply
) => {
  try {
    let token: string | undefined;

    if (request.cookies?.accessToken) {
      token = request.cookies.accessToken;
    } else {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      request.user = undefined;
      return;
    }

    const payload = await request.server.jwt.verify<{
      sub: string;
      email: string;
      role: Role;
      sessionId?: string;
    }>(token);

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };
  } catch {
    // Ignorar errores de autenticación en optionalAuth
    request.user = undefined;
  }
};
