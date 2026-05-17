import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import {
  generateTokenPair,
  refreshAccessToken,
  revokeRefreshToken,
  hashToken,
} from './jwt.service';
import {
  generateMFASecret,
  verifyMFACode,
  enableMFA,
  disableMFA,
  isMFAEnabled,
} from './mfa.service';
import { RegisterSchema, LoginSchema } from './auth.schema';
import type { RegisterInput, LoginInput } from './auth.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { initAdminSession, revokeAdminSession } from '../../middleware/admin-auth.middleware';
import { sendWelcomeEmail, sendNewDeviceAlert } from '../../services/email.service';
import { alertBruteForce } from '../../services/alert.service';

/**
 * Opciones para cookie httpOnly de refresh token.
 */
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
};

/**
 * Opciones para cookie httpOnly de access token.
 * SECURITY: Access token en cookie httpOnly previene XSS (antes estaba en localStorage).
 */
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 15 * 60, // 15 minutos en segundos
};

/**
 * Mensaje genérico para errores de login.
 * NUNCA revela si el email existe o no.
 */
const AUTH_ERROR_MSG = 'Credenciales inválidas';

type LoginUser = {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string | null;
  role: 'USER' | 'ADMIN';
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  isBanned: boolean;
};

/**
 * Registra todas las rutas de autenticación.
 */
export async function authRoutes(app: FastifyInstance) {
  // ==========================================
  // POST /api/auth/register
  // ==========================================
  app.post(
    '/api/auth/register',
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      // 1. Validar input
      const data = request.validate(RegisterSchema, 'body') as RegisterInput;

      // 2. Verificar email no exista (incluyendo soft-deleted)
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          deletedAt: null,
        },
      });

      if (existingUser) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Este email ya está registrado.',
          },
        });
      }

      // 3. Hash password
      const passwordHash = await bcrypt.hash(data.password, 12);

      // 4. Crear usuario
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          role: 'USER',
          isEmailVerified: false,
        },
        // No omit passwordHash aquí porque la respuesta no la incluye
        // (prisma client config ya la omite por defecto)
      });

      // 5. Generar tokens
      const ipAddress = request.ip ?? 'unknown';
      const deviceInfo = request.headers['user-agent'] ?? 'unknown';

      const { accessToken, refreshToken } = await generateTokenPair(
        app,
        user.id,
        'USER',
        deviceInfo,
        ipAddress
      );

      // 6. Setear cookies httpOnly (access + refresh)
      // SECURITY FIX: accessToken ahora también es httpOnly cookie (antes solo refreshToken era cookie)
      reply.setCookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
      reply.setCookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

      // 7. Enviar email de bienvenida (no bloqueante)
      sendWelcomeEmail(app, { userEmail: user.email, userName: user.name }).catch((err) => {
        app.log.error({ err, userId: user.id }, 'Error al enviar email de bienvenida');
      });

      // 8. Responder
      // SECURITY FIX: accessToken ya no se envía en el body (es httpOnly cookie)
      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            mfaEnabled: user.mfaEnabled,
          },
          expiresIn: 900,
        },
      });
    }
  );

  // ==========================================
  // POST /api/auth/login
  // ==========================================
  app.post(
    '/api/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
        },
      },
    },
    async (request, reply) => {
      const ipAddress = request.ip ?? 'unknown';
      const deviceInfo = request.headers['user-agent'] ?? 'unknown';

      // 1. Verificar intentos fallidos (Redis counter)
      const attemptKey = `login_attempts:${ipAddress}`;
      const attempts = parseInt((await app.redis.get(attemptKey)) ?? '0', 10);

      // SECURITY: Alerta de brute force si hay más de 10 intentos en 5 minutos
      if (attempts >= 10) {
        // No bloqueante: enviar alerta y bloquear IP en Cloudflare
        alertBruteForce(app, ipAddress, attempts).catch((err) => {
          app.log.error({ err, ip: ipAddress }, 'Error al enviar alerta de brute force');
        });
      }

      if (attempts >= 5) {
        return reply.status(429).send({
          success: false,
          error: {
            code: 'TOO_MANY_ATTEMPTS',
            message:
              'Demasiados intentos fallidos. Por favor espera 15 minutos.',
          },
        });
      }

      // 2. Validar input
      const data = request.validate(LoginSchema, 'body') as LoginInput;

      // 3. Buscar usuario incluyendo passwordHash para comparación.
      const [user] = await prisma.$queryRaw<LoginUser[]>`
        SELECT
          id,
          email,
          password_hash AS "passwordHash",
          name,
          role,
          is_email_verified AS "isEmailVerified",
          mfa_enabled AS "mfaEnabled",
          is_banned AS "isBanned"
        FROM users
        WHERE email = ${data.email} AND deleted_at IS NULL
        LIMIT 1
      `;

      // 4. Si no existe o password incorrecto → mensaje genérico
      if (!user || !user.passwordHash) {
        // Incrementar counter
        await app.redis.incr(attemptKey);
        await app.redis.expire(attemptKey, 15 * 60); // 15 minutos TTL

        // Loggear intento fallido (sin password)
        app.log.warn({
          action: 'LOGIN_FAILED',
          email: data.email,
          ip: ipAddress,
          reason: 'USER_NOT_FOUND',
        });

        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: AUTH_ERROR_MSG,
          },
        });
      }

      const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);

      if (!passwordMatch) {
        // Incrementar counter
        await app.redis.incr(attemptKey);
        await app.redis.expire(attemptKey, 15 * 60);

        // Actualizar failedLoginAttempts en DB
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            lastFailedLogin: new Date(),
          },
        });

        // Loggear intento fallido
        app.log.warn({
          action: 'LOGIN_FAILED',
          email: data.email,
          ip: ipAddress,
          reason: 'WRONG_PASSWORD',
        });

        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: AUTH_ERROR_MSG,
          },
        });
      }

      // 5. Resetear contador de intentos fallidos
      await app.redis.del(attemptKey);

      // 6. Verificar si cuenta está bloqueada
      if (user.isBanned) {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'ACCOUNT_BANNED',
            message: 'Tu cuenta ha sido suspendida. Contacta soporte.',
          },
        });
      }

      // 7. Resetear failedLoginAttempts en DB
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLogin: null,
        },
      });

      // 8. Verificar MFA
      const mfaRequired = await isMFAEnabled(user.id);

      // 9. Generar tokens
      const tokenPair = await generateTokenPair(
        app,
        user.id,
        user.role,
        deviceInfo,
        ipAddress
      );

      // 10. Setear cookies httpOnly (access + refresh)
      // SECURITY FIX: accessToken ahora también es httpOnly cookie
      reply.setCookie('accessToken', tokenPair.accessToken, ACCESS_COOKIE_OPTIONS);
      reply.setCookie('refreshToken', tokenPair.refreshToken, REFRESH_COOKIE_OPTIONS);

      // 11. Inicializar sesión de admin si el usuario es ADMIN
      if (user.role === 'ADMIN') {
        await initAdminSession(app.redis, user.id);
      }

      // 12. Detectar login desde nuevo dispositivo/IP
      const existingSessions = await prisma.session.findMany({
        where: {
          userId: user.id,
          revokedAt: null,
          id: { not: tokenPair.sessionId },
        },
        select: { ipAddress: true, deviceInfo: true },
      });

      const isNewDevice = !existingSessions.some(
        (s) => s.ipAddress === ipAddress && s.deviceInfo === deviceInfo
      );

      if (isNewDevice && existingSessions.length > 0) {
        // Enviar alerta de seguridad (no bloqueante)
        sendNewDeviceAlert(app, {
          userEmail: user.email,
          userName: user.name,
          deviceInfo,
          ipAddress,
          loginTime: new Date(),
        }).catch((err) => {
          app.log.error({ err, userId: user.id }, 'Error al enviar alerta de nuevo dispositivo');
        });
      }

      // 13. Responder
      // SECURITY FIX: accessToken ya no se envía en el body (es httpOnly cookie)
      const responseData: Record<string, unknown> = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
        },
        expiresIn: 900,
      };

      // Si MFA está habilitado, requerir verificación adicional
      if (mfaRequired) {
        // Guardar token temporal MFA en Redis (5 minutos)
        // Usamos el access token generado como mfa token temporal
        const mfaToken = tokenPair.accessToken;
        await app.redis.setex(`mfa_pending:${user.id}`, 5 * 60, mfaToken);

        return reply.status(200).send({
          success: true,
          data: {
            ...responseData,
            mfaRequired: true,
            mfaToken,
          },
        });
      }

      return reply.status(200).send({
        success: true,
        data: responseData,
      });
    }
  );

  // ==========================================
  // POST /api/auth/mfa/verify
  // ==========================================
  app.post('/api/auth/mfa/verify', async (request, reply) => {
    const body = request.body as { mfaToken: string; code: string };
    const { mfaToken, code } = body;

    if (!mfaToken || !code) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MFA_MISSING',
          message: 'Se requiere mfaToken y código MFA.',
        },
      });
    }

    // Verificar mfaToken y extraer userId
    let payload: { sub: string };
    try {
      payload = app.jwt.verify<{ sub: string }>(mfaToken, {
        clockTolerance: 60,
      });
    } catch {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MFA_TOKEN_INVALID',
          message: 'Token MFA inválido o expirado.',
        },
      });
    }

    // Verificar que existe en Redis
    const pending = await app.redis.get(`mfa_pending:${payload.sub}`);
    if (!pending) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MFA_EXPIRED',
          message: 'La sesión MFA ha expirado. Inicia sesión nuevamente.',
        },
      });
    }

    // Verificar código TOTP
    const isValid = await verifyMFACode(payload.sub, code);
    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MFA_INVALID_CODE',
          message: 'Código MFA inválido.',
        },
      });
    }

    // Limpiar pending MFA
    await app.redis.del(`mfa_pending:${payload.sub}`);

    // Generar tokens finales
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado.',
        },
      });
    }

    const ipAddress = request.ip ?? 'unknown';
    const deviceInfo = request.headers['user-agent'] ?? 'unknown';

    const tokenPair = await generateTokenPair(
      app,
      user.id,
      user.role,
      deviceInfo,
      ipAddress
    );

    // SECURITY FIX: accessToken ahora también es httpOnly cookie
    reply.setCookie('accessToken', tokenPair.accessToken, ACCESS_COOKIE_OPTIONS);
    reply.setCookie('refreshToken', tokenPair.refreshToken, REFRESH_COOKIE_OPTIONS);

    // Inicializar sesión de admin si el usuario es ADMIN
    if (user.role === 'ADMIN') {
      await initAdminSession(app.redis, user.id);
    }

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
        },
        expiresIn: 900,
      },
    });
  });

  // ==========================================
  // POST /api/auth/logout
  // ==========================================
  app.post('/api/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (refreshToken) {
      await revokeRefreshToken(app, refreshToken);
    }

    // SECURITY FIX: Limpiar ambas cookies (access + refresh)
    reply.clearCookie('accessToken', ACCESS_COOKIE_OPTIONS);
    reply.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

    return reply.status(204).send();
  });

  // ==========================================
  // POST /api/auth/refresh
  // ==========================================
  app.post('/api/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'No se encontró refresh token.',
        },
      });
    }

    try {
      const tokenPair = await refreshAccessToken(app, refreshToken);

      // Setear nueva cookies (access + refresh)
      // SECURITY FIX: accessToken ahora también es httpOnly cookie
      reply.setCookie('accessToken', tokenPair.accessToken, ACCESS_COOKIE_OPTIONS);
      reply.setCookie('refreshToken', tokenPair.refreshToken, REFRESH_COOKIE_OPTIONS);

      return reply.status(200).send({
        success: true,
        data: {
          expiresIn: tokenPair.expiresIn,
        },
      });
    } catch {
      // Token inválido, expirado o en blacklist
      reply.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);

      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Sesión inválida. Por favor inicia sesión nuevamente.',
        },
      });
    }
  });

  // ==========================================
  // GET /api/auth/me
  // ==========================================
  app.get('/api/auth/me', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado.',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          mfaEnabled: user.mfaEnabled,
        },
      },
    });
  });

  // ==========================================
  // GET /api/auth/sessions
  // ==========================================
  app.get('/api/auth/sessions', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
        },
      });
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({
      success: true,
      data: { sessions },
    });
  });

  // ==========================================
  // DELETE /api/auth/sessions/:sessionId
  // ==========================================
  app.delete(
    '/api/auth/sessions/:sessionId',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const userId = request.user?.id;
      const { sessionId } = request.params as { sessionId: string };

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'No autenticado.',
          },
        });
      }

      // Verificar que la sesión pertenece al usuario
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
        },
      });

      if (!session) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Sesión no encontrada.',
          },
        });
      }

      // Revocar sesión
      await prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });

      // Agregar hash a blacklist Redis
      const remainingSeconds = Math.max(
        0,
        Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      );
      if (remainingSeconds > 0) {
        await app.redis.setex(
          `bl:rt:${session.refreshTokenHash}`,
          remainingSeconds,
          '1'
        );
      }

      return reply.status(204).send();
    }
  );

  // ==========================================
  // MFA Routes
  // ==========================================

  // POST /api/auth/mfa/setup
  app.post('/api/auth/mfa/setup', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuario no encontrado.',
        },
      });
    }

    const setup = await generateMFASecret(userId, user.email);

    return reply.status(200).send({
      success: true,
      data: setup,
    });
  });

  // POST /api/auth/mfa/enable
  app.post('/api/auth/mfa/enable', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;
    const body = request.body as { code: string };

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
        },
      });
    }

    const success = await enableMFA(userId, body.code);

    if (!success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MFA_ENABLE_FAILED',
          message: 'Código MFA inválido. No se pudo habilitar MFA.',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'MFA habilitado exitosamente.' },
    });
  });

  // POST /api/auth/mfa/disable
  app.post('/api/auth/mfa/disable', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user?.id;
    const body = request.body as { code: string };

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No autenticado.',
        },
      });
    }

    const success = await disableMFA(userId, body.code);

    if (!success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MFA_DISABLE_FAILED',
          message: 'Código MFA inválido. No se pudo deshabilitar MFA.',
        },
      });
    }

    return reply.status(200).send({
      success: true,
      data: { message: 'MFA deshabilitado exitosamente.' },
    });
  });
}
