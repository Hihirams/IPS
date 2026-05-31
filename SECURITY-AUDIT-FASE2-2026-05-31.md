# Auditoría de Seguridad Defensiva — IPS Ecommerce Tech
**Fecha:** 2026-05-31 · **Alcance:** OWASP Top 10 + ASVS básico/intermedio · **Stack:** Next.js 14 + Fastify + Prisma + PostgreSQL + Redis + Stripe (monorepo pnpm) · **Hosting:** Railway

> Este documento NO afirma que la tienda sea "inhackeable". Describe el estado real verificado en el código, los cambios aplicados y cómo comprobar cada uno. La seguridad es continua: ver "Riesgos que quedan".

---

## 1. Resumen de cambios aplicados

Alcance elegido: **"todo lo seguro"** (cambios de bajo riesgo, con verificación). Los puntos que pueden romper el frontend o requieren tu cuenta externa quedan como pasos guiados.

| # | Cambio | Archivo | Tipo |
|---|--------|---------|------|
| 1 | Verificación de monto en webhook: la orden solo se confirma si `paymentIntent.amount_received` == `order.total` (en centavos) y la moneda coincide. Si no, se registra alerta y NO se confirma. | `apps/api/src/modules/checkout/checkout.routes.ts` | Código |
| 2 | Idempotencia atómica del webhook con Redis `SET NX` + TTL (cierra la condición de carrera TOCTOU ante reintentos concurrentes de Stripe). Se libera el lock si el handler falla, para permitir reproceso manual. | `apps/api/src/modules/checkout/checkout.routes.ts` | Código |
| 3 | Upload admin: límite duro de tamaño antes de decodificar base64 (anti-DoS), y el MIME se deriva del data-URI (no se confía en `body.mimeType` del cliente); solo JPEG/PNG/WebP. | `apps/api/src/modules/admin/admin.routes.ts` | Código |
| 4 | Secreto `sk_live_` retirado del disco: `stripecodex.txt` fue sobrescrito con instrucciones de rotación (el contenido sensible ya no está en texto plano). | `stripecodex.txt` | Limpieza |
| 5 | `.gitignore` reforzado para no versionar scripts/dumps sueltos (`disable-mfa.js`, `api-dev-*.txt`, `syscom*.yaml`, reporte JSON). | `.gitignore` | Limpieza |
| 6 | **Reset de contraseña** implementado (`/api/auth/forgot-password` + `/api/auth/reset-password`): token de un solo uso en Redis (hash SHA-256, TTL 30 min), respuesta genérica anti-enumeración, rate-limit, revocación de sesiones al cambiar la clave. Sin migración de BD. | `auth.routes.ts`, `auth.schema.ts`, `email.service.ts`, `csrf.ts` | Código (feature) |

**Pendiente de ejecutar por ti** (el sandbox no tiene tus credenciales ni puede borrar/`git rm` en tu disco): rotar la clave Stripe, borrar archivos del repo, y desplegar. Ver sección 5.

---

## 2. Estado verificado (lo que ya estaba bien)

Confirmado leyendo el código, no asumido:

- **Contraseñas:** bcrypt cost 12. Login con mensaje genérico `Credenciales inválidas` (no revela si el email existe). Contador de intentos en Redis + en DB.
- **JWT/Sesiones:** access 15 min, refresh 7 días con secretos separados. Rotación de refresh + blacklist en Redis. Revocación de sesión validada en cada request. `accessToken` y `refreshToken` en cookies `httpOnly`, `Secure` (en prod), `SameSite=strict` — sin tokens en `localStorage`.
- **Autorización:** rutas admin tras `authenticate → requireAdmin → requireMFA → requireAdminSession` + rate-limit 30/min. Sesión admin con TTL de 30 min en Redis y alerta de IP nueva.
- **IDOR órdenes:** `prisma.order.findFirst({ where: { id, userId } })` — un usuario no puede leer órdenes ajenas.
- **Precios server-side:** el checkout calcula `subtotal/shipping/tax/total` desde `product.price` en BD. El cliente solo envía `addressId` y `notes`. **No puede manipular precios ni totales.**
- **Webhook Stripe:** firma verificada con `stripe.webhooks.constructEvent`. La orden pasa a `CONFIRMED` **solo** dentro del handler del webhook.
- **Inputs:** validación con Zod (`request.validate`) en body/params/query; errores 400 sin filtrar detalles internos.
- **SQL injection:** un único `$queryRaw` (login), parametrizado vía tagged template. Toda búsqueda usa Prisma `contains` (parametrizado). Sin `queryRawUnsafe`.
- **XSS:** sin `dangerouslySetInnerHTML`/`eval` en el frontend. Helmet con CSP en el API; headers estrictos en Next.js.
- **CSRF:** doble-submit cookie con comparación timing-safe; webhooks exentos (usan firma).
- **Rate limiting:** login 5/15min, registro 3/h, pago 5/h, admin 30/min, global 100/min (store en Redis).
- **Errores en prod:** handler global devuelve mensaje genérico y código `INTERNAL_ERROR` en 5xx; el stack se registra en logs, no se envía al cliente.
- **Env:** validación con Zod al arranque (JWT ≥32, CSRF ≥16, secretos obligatorios, checks extra en producción).

---

## 3. Checklist verificable (OWASP)

Prioridad: 🔴 crítica · 🟠 alta · 🟡 media · ⚪ baja

| Riesgo (OWASP) | Estado | Archivo | Cómo probarlo | Qué pasa si no se corrige | Prio |
|---|---|---|---|---|---|
| A02 Secreto `sk_live` en texto plano (`stripecodex.txt`) | ⚠️ Parcial — contenido retirado del disco; **falta rotar** | `stripecodex.txt` | `grep -r "sk_live" .` → sin resultados. Confirmar rotación en dashboard Stripe. | Cobro/fraude con tu cuenta Stripe si la clave se filtra | 🔴 |
| A02 `disable-mfa.js` versionado | ⏳ Pendiente (tú: `git rm`) | `disable-mfa.js` | `git ls-files \| grep disable-mfa` → vacío | Cualquiera con el repo puede desactivar el MFA del admin | 🟡 |
| A04 Webhook confirma sin validar monto | ✅ Corregido | `checkout.routes.ts` | Forzar `amount` distinto al total → orden NO pasa a CONFIRMED; log `WEBHOOK_AMOUNT_MISMATCH` | Orden marcada pagada con monto erróneo | 🟡 |
| A04 Idempotencia frágil del webhook | ✅ Corregido | `checkout.routes.ts` | Enviar 2 veces el mismo `event.id` → segundo responde `duplicate` | Doble confirmación / doble descuento de stock | ⚪ |
| A01 IDOR en órdenes | ✅ Ya seguro | `order.routes.ts` | Pedir `/api/orders/{id_de_otro}` con tu token → 404 | Fuga de pedidos/datos de otros usuarios | 🟠 |
| A01 Acceso a endpoints admin por usuario normal | ✅ Ya seguro | `admin.routes.ts`, `auth.middleware.ts` | Llamar `/api/admin/*` con token USER → 403 | Escalada de privilegios | 🔴 |
| A03 SQL injection | ✅ Ya seguro | `auth.routes.ts`, `products.routes.ts` | `' OR 1=1--` en login/búsqueda → sin efecto | Volcado de BD | 🔴 |
| A03 XSS reflejado/almacenado | ✅ Ya seguro | `apps/web/*`, `products.helpers.ts` | Crear producto con `<script>` → se escapa/sanitiza | Robo de sesión, defacement | 🟠 |
| A05 Precio controlado por frontend | ✅ Ya seguro | `checkout.service.ts` | Mandar `price` falso en el body → ignorado | Compras a precio manipulado | 🔴 |
| A05 CSP del frontend en `Report-Only` | ⏳ Pendiente (guiado) | `apps/web/src/middleware.ts` | `curl -I` a una página → header `Content-Security-Policy` (no `-Report-Only`) | Menor mitigación de XSS en navegador | 🟡 |
| A07 Rate limit en login | ✅ Ya seguro | `auth.routes.ts` | 6 logins fallidos → 429 | Fuerza bruta de credenciales | 🟠 |
| A07 Reset de contraseña con token de un solo uso | ✅ Implementado | `auth.routes.ts`, `auth.schema.ts`, `email.service.ts` | Reusar token → rechazado (400). Solicitar 2 veces → solo el último sirve | Toma de cuenta | 🟠 |
| A05 Cookies `SameSite=strict` + subdominios Railway | ⏳ Decisión deploy | `auth.routes.ts` | Login en prod real; ver si la cookie viaja | Login roto en producción | 🟠 |
| A09 Errores con stack en prod | ✅ Ya seguro | `index.ts` | Forzar 500 con `NODE_ENV=production` → mensaje genérico | Fuga de rutas/infra interna | 🟡 |
| A04 Upload admin sin límites | ✅ Reforzado | `admin.routes.ts`, `upload.service.ts` | Subir >5MB o `.svg` → 413/400 | DoS / archivos peligrosos | ⚪ |

---

## 4. Plan de pruebas (Fase 4)

Hay tests automatizados en `apps/api/src/tests/security/` (`auth`, `rate-limit`, `sql-injection`, `webhook`). Ejecútalos con `pnpm --filter @ecommerce/api test`. Abajo, cómo verificar manualmente cada escenario pedido. Reemplaza `$API` por tu URL (`http://localhost:4000` o la de Railway) y usa cookies de un login real.

1. **Un usuario no ve órdenes de otro.** Loguéate como User A, crea una orden, copia su `id`. Loguéate como User B y pide `GET $API/api/orders/{idDeA}` → **404** (no 200). Automatizable en un test de integración con dos usuarios.

2. **Usuario normal no entra a admin.** Con token USER: `GET $API/api/admin/dashboard/metrics` → **403 FORBIDDEN**. Sin token → 401.

3. **No se puede cambiar el precio desde el frontend.** En `POST $API/api/checkout/create-payment-intent` añade campos `price`, `total`, `amount` falsos en el body → se ignoran; el `clientSecret` se genera por el total calculado en BD. Verifica el monto en el dashboard de Stripe.

4. **No se marca una orden como pagada sin webhook válido.** `POST $API/api/webhooks/stripe` con body de `payment_intent.succeeded` y firma falsa → **400**. La orden permanece `PENDING`. Solo un evento con firma válida (y ahora monto coincidente) la pasa a `CONFIRMED`.

5. **Login con rate limit.** 6 intentos con contraseña incorrecta desde la misma IP → el 6º devuelve **429 TOO_MANY_ATTEMPTS**.

6. **Reset de contraseña: token temporal de un solo uso.** (Ya implementado.) `POST $API/api/auth/forgot-password` con `{ "email": "tu@correo.com" }` → 200 con mensaje genérico (igual exista o no el email). Toma el `token` del enlace del correo (o del log si Resend no está configurado) y haz `POST $API/api/auth/reset-password` con `{ "token": "...", "password": "NuevaPass1!" }` → 200. Reusa el mismo token → **400 INVALID_RESET_TOKEN**. Tras el cambio, todas las sesiones previas quedan revocadas.

7. **Inputs maliciosos no rompen ni ejecutan scripts.** Registro con `email: "a@a.com<script>alert(1)</script>"` → 400 de validación Zod. Búsqueda `?search=' OR 1=1--` → resultados normales/vacíos, sin error 500.

8. **No hay secretos en el repo.** `git grep -nE "sk_live|sk_test|whsec|pk_live" -- . ':!*.example' ':!*.md'` → sin resultados reales (solo placeholders). `git ls-files | grep -E "disable-mfa|\.env$"` → vacío.

9. **Errores de producción sin stack trace.** Con `NODE_ENV=production`, provoca un 500 → respuesta `{ error: { code: "INTERNAL_ERROR", message: "Ocurrió un error interno..." } }`, sin stack ni rutas.

10. **Cookies/tokens con config segura.** Tras login en HTTPS, inspecciona `Set-Cookie`: `accessToken`/`refreshToken` deben tener `HttpOnly`, `Secure`, `SameSite=Strict`. El `csrf-token` es legible por JS a propósito (patrón doble-submit).

---

## 5. Deploy a Railway — comandos (ejecútalos tú)

> No pude ejecutarlos aquí: este entorno no tiene `railway`/`gh` CLI ni tus credenciales, y el push a `github.com/Hihirams/IPS` requiere tu autenticación. Corre esto en tu terminal, en la raíz del repo.

### Paso 0 — Rotar el secreto Stripe (HAZLO PRIMERO)
1. Stripe Dashboard → Developers → API keys → **Roll** la `sk_live_...` (la anterior queda comprometida).
2. Guarda la nueva clave en Railway como variable `STRIPE_SECRET_KEY` (NO en archivos).

### Paso 1 — Limpiar archivos del repo
```bash
git rm -f disable-mfa.js
git rm --cached api-dev-err.txt api-dev-out.txt
del stripecodex.txt        # Windows (o: rm stripecodex.txt en Git Bash)
```

### Paso 2 — Verificar que nada se rompió (GATE obligatorio)
```bash
pnpm install
pnpm --filter @ecommerce/api prisma generate
pnpm type-check          # debe pasar sin errores
pnpm --filter @ecommerce/api test
pnpm build               # build de api + web
```
Si `type-check`, `test` y `build` pasan, continúa. Si algo falla, NO despliegues.

### Paso 3 — Commit en una rama (no directo a master)
```bash
git checkout -b security/fase2-hardening
git add -A
git commit -m "security: reset de contrasena (token un solo uso), webhook amount check + idempotencia atomica, upload admin hardening, limpieza de secretos"
git push -u origin security/fase2-hardening
```

### Paso 4 — Variables de entorno en Railway
Confirma en el servicio del API (Railway → Variables) que están definidas y son de **producción**:
`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `STRIPE_SECRET_KEY` (nueva), `STRIPE_WEBHOOK_SECRET`, `CSRF_SECRET`, `AES_PHONE_KEY`, `MFA_SECRET_KEY`, `SYSCOM_CLIENT_ID`, `SYSCOM_CLIENT_SECRET`, `NODE_ENV=production`, y `CORS_ORIGIN` = la URL real del frontend (NO `localhost`).

### Paso 5 — Deploy
- **Si Railway está conectado a GitHub:** haz merge del PR a la rama que Railway observa → despliega solo. O usa la rama directamente si así lo tienes configurado.
- **Si usas Railway CLI:**
```bash
npm i -g @railway/cli
railway login
railway link          # selecciona el proyecto/servicio
railway up            # despliega el código actual
railway logs          # verifica arranque sin errores
```

### Paso 6 — Webhook de Stripe apuntando a prod
En Stripe → Developers → Webhooks: el endpoint debe ser `https://TU-API.up.railway.app/api/webhooks/stripe` y el `STRIPE_WEBHOOK_SECRET` en Railway debe ser el de ese endpoint. Usa "Send test webhook" y confirma 200.

### Paso 7 — Smoke test en producción
Ejecuta los puntos 2, 4, 5 y 10 de la sección 4 contra la URL real.

---

## 6. Riesgos que todavía quedan / a revisar

1. **Rotación de la clave Stripe (acción tuya).** Hasta rotarla, considérala comprometida.
2. **CSP en `Report-Only`.** El frontend no bloquea scripts inyectados, solo los reporta. Pasar a enforcement con Next.js 14 requiere nonces para los scripts inline del framework; hay que probarlo en staging antes de prod para no romper la app.
3. **Cookies `SameSite=strict` entre subdominios de Railway.** Si el front y el API quedan en subdominios distintos de `*.up.railway.app`, el navegador puede no enviar la cookie de sesión y romper el login. Recomendado: **dominio propio** (`tienda.tudominio.com` + `api.tudominio.com`) con `SameSite=Lax`, o un proxy que ponga front y API bajo el mismo origen.
4. **Reset de contraseña.** ✅ Implementado en esta sesión (`/api/auth/forgot-password` y `/api/auth/reset-password`): token aleatorio de 32 bytes, en Redis se guarda solo su hash SHA-256, TTL 30 min, un solo uso (se borra al usarse), respuesta genérica anti-enumeración, rate-limit, y revocación de todas las sesiones al cambiar la contraseña. **Falta:** la página `/reset-password` en el frontend que tome el `token` de la URL y llame al endpoint (es trabajo de front).
5. **MFA opcional para admin.** El sistema permite admin sin MFA activado (para poder configurarlo). Recomendado: forzar MFA obligatorio para todo rol ADMIN tras un período de gracia.
6. **Verificación de email.** Los usuarios se crean con `isEmailVerified: false` pero no vi enforcement que bloquee acciones sensibles sin verificar. Revisar si debe exigirse.
7. **Cobertura de tests.** Los tests de seguridad existentes son ligeros (sobre todo de firma/rate-limit). Conviene añadir tests de integración con DB para IDOR (punto 1), admin-gating (2) y monto del webhook (3, 4).
8. **Sin WAF/escaneo continuo.** Hay integración con Cloudflare para bloqueo de IP, pero conviene un escaneo periódico de dependencias (`pnpm audit`, Dependabot) y revisar el hash SRI de `stripe.js` cuando Stripe actualice.

---

## 7. Recomendaciones antes de producción (orden sugerido)

1. Rotar Stripe + limpiar archivos (Paso 0–1).
2. Correr el gate `type-check` + `test` + `build` (Paso 2). No desplegar si falla.
3. Resolver el tema de cookies/dominio (riesgo #3) — es lo que más probablemente rompa el login real.
4. Verificar/implementar reset de contraseña (riesgo #4).
5. Desplegar a una rama de staging primero, correr el smoke test, y recién entonces a producción.
6. Programar `pnpm audit` y un repaso de este checklist de forma periódica.
