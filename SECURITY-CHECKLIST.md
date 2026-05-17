# Security Checklist - Ecommerce Tech

> Checklist de verificación de seguridad para el ecommerce de tecnología.
> Actualizado: 2026-05-16
> Fase: Hardening Final (Fase 7)

---

## Infraestructura y Transporte

- [x] **HTTPS habilitado y HSTS configurado**
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - Configurado en `apps/web/src/middleware.ts`

- [x] **Headers de seguridad verificados**
  - `X-Frame-Options: DENY` (clickjacking protection)
  - `X-Content-Type-Options: nosniff` (MIME sniffing protection)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` restringe APIs del navegador

- [x] **CSP sin unsafe-inline en scripts**
  - `script-src 'self' https://js.stripe.com 'sha384-...'`
  - Sin `'unsafe-inline'` en scripts (solo en styles, necesario para Tailwind)
  - Fase 1: Report-Only; cambiar a enforcement después de validar

---

## Autenticación y Autorización

- [x] **Access token en cookie httpOnly (no localStorage)**
  - Ambos tokens (access + refresh) son cookies httpOnly
  - Frontend no tiene acceso JavaScript a tokens
  - Previene robo de tokens vía XSS

- [x] **Refresh tokens almacenados hasheados**
  - `refreshTokenHash = SHA-256(refreshToken)` en DB
  - Nunca se almacena el token en texto plano

- [x] **JWT blacklist check**
  - `authenticate` middleware verifica que la sesión no esté revocada
  - `revokeAllUserSessions` blacklista tokens en Redis

- [x] **MFA habilitado para todos los admins**
  - Admin routes: `authenticate` → `requireAdmin` → `requireMFA` → `requireAdminSession`
  - Admin session Redis TTL: 30 minutos

- [x] **Rate limiting activo**
  - Global: 100 req/min por IP
  - Login: 5 intentos / 15 min
  - Register: 3 intentos / hora
  - Admin: 30 req/min
  - Checkout: 5 intentos / hora

- [x] **Login no revela si email existe**
  - Mensaje genérico: "Credenciales inválidas"
  - Mismo tiempo de respuesta para email existente y no existente

---

## Pagos y Datos PCI

- [x] **Webhook de Stripe verifica firma en cada request**
  - `verifyWebhookSignature(payload, signature)` con `STRIPE_WEBHOOK_SECRET`
  - Webhook sin firma o firma inválida → 400 Bad Request

- [x] **No se guardan datos PCI en la base de datos**
  - Números de tarjeta, CVV, etc. nunca tocan nuestro servidor
  - Stripe Elements maneja todo el input de tarjeta

- [x] **Anti-Magecart**
  - CSP estricto en checkout
  - SRI en stripe.js (hash SHA-384)
  - Monitoreo de integridad de stripe.js (cada hora)
  - Alerta crítica si el hash cambia

---

## Monitoreo y Alertas

- [x] **Sentry configurado**
  - Captura excepciones no manejadas
  - `ignoreErrors`: 401, 404, rate limits (errores esperados)
  - `scrubFields`: passwords, tokens, tarjetas, CVV, secrets

- [x] **Alertas de seguridad automáticas**
  - >10 intentos login fallidos → Slack + Cloudflare block
  - >5 pagos fallidos → revisión manual
  - Webhook firma inválida → alerta crítica inmediata
  - Error 500 en checkout → alerta inmediata
  - Admin desde IP nueva → email al admin

- [x] **Logging estructurado con Pino**
  - Formato JSON en producción
  - Niveles: trace, debug, info, warn, error, fatal
  - NUNCA loguea: passwords, tokens, datos de tarjeta, CVV
  - SIEMPRE loguea: userId, IP, endpoint, statusCode, responseTime

---

## Privacidad y GDPR

- [x] **Exportación de datos (derecho de portabilidad)**
  - `GET /api/user/export-data` → JSON completo
  - Excluye: passwordHash, mfaSecret, datos de auditoría interna
  - Rate limit: 1 exportación / semana

- [x] **Eliminación de cuenta**
  - `DELETE /api/user/delete-account`
  - Verifica password antes de eliminar
  - Soft delete + anonimización (no borra órdenes)
  - Revoca todas las sesiones
  - Email de confirmación

---

## Base de Datos y Validación

- [x] **SQL Injection prevention**
  - Prisma ORM usa parameterized queries
  - Zod validación en TODOS los inputs
  - Tests de seguridad verifican inputs maliciosos

- [x] **XSS prevention**
  - DOMPurify sanitiza HTML de reseñas
  - CSP bloquea scripts inline
  - Access token en httpOnly cookie (no localStorage)

---

## CI/CD y Despliegue

- [x] **GitHub Actions CI/CD seguro**
  - `npm audit --audit-level=high` en cada PR
  - gitleaks scan de secretos
  - ESLint + TypeScript strict
  - Tests con cobertura mínima 70%
  - Build verifica que no hay console.log
  - Deploy solo en push a main
  - Variables de entorno nunca en logs

---

## Infraestructura Externa

- [ ] **Cloudflare WAF activo**
  - Reglas para OWASP Top 10
  - Rate limiting en edge
  - Bot management (si está disponible en plan)

- [ ] **Backups automáticos de PostgreSQL**
  - Backups diarios
  - Retención mínima: 30 días
  - Restauración testeada periódicamente

- [x] **Política de retención de logs**
  - Aplicación: 90 días mínimo
  - Auditoría de seguridad: 1 año
  - Logs de acceso: 30 días

---

## Próximos Pasos / Mejoras Pendientes

- [ ] **Cambiar CSP de Report-Only a Enforcement**
  - Validar que no hay violaciones en producción
  - Monitorear `/api/csp-report` durante 1 semana

- [ ] **Implementar email verification flow**
  - Enviar email de verificación al registrarse
  - No permitir compras sin email verificado

- [ ] **Password reset / forgot password**
  - Flow seguro con token de un solo uso
  - Expiración de token: 1 hora

- [ ] **Implementar Content Security Policy en API (Helmet)**
  - Actualmente CSP es solo en frontend (Next.js middleware)
  - Agregar CSP también en respuestas de API para defensa en profundidad

- [ ] **Suscribirse a alertas de seguridad**
  - Next.js: https://github.com/vercel/next.js/security/advisories
  - Fastify: https://github.com/fastify/fastify/security/advisories
  - Prisma: https://github.com/prisma/prisma/security/advisories
  - Stripe: https://stripe.com/docs/security

---

## Verificación de Headers

Para verificar los headers de seguridad en producción:

```bash
curl -I https://tudominio.com
```

Debería mostrar:
- `strict-transport-security: max-age=63072000; includeSubDomains; preload`
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `content-security-policy-report-only: ...`
- `referrer-policy: strict-origin-when-cross-origin`

También se puede usar: https://securityheaders.com

---

## Changelog de Seguridad

| Fecha | Cambio | Severidad |
|-------|--------|-----------|
| 2026-05-16 | Fase 7: Hardening final completo | Crítica |
| 2026-05-16 | accessToken movido de localStorage a cookie httpOnly | Crítica |
| 2026-05-16 | Raw body parser scopado solo a webhook de Stripe | Alta |
| 2026-05-16 | JWT blacklist check en authenticate middleware | Media |
| 2026-05-16 | CSP + SRI anti-Magecart implementados | Crítica |
| 2026-05-16 | Sentry + alertas de seguridad automáticas | Alta |
| 2026-05-16 | Tests de seguridad (auth, rate-limit, webhook, SQLi) | Alta |
| 2026-05-16 | GDPR: export-data y delete-account | Media |
| 2026-05-16 | CI/CD seguro con GitHub Actions | Alta |
