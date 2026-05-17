import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware: seguridad anti-Magecart.
 *
 * Agrega headers de seguridad estrictos en TODAS las respuestas:
 * - Content-Security-Policy (Report-Only primero, luego enforcement)
 * - HSTS (HTTPS obligatorio)
 * - X-Frame-Options (clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - Referrer-Policy
 *
 * SECURITY: CSP sin 'unsafe-inline' en scripts previene inyección de scripts maliciosos.
 */

// Hash SHA-384 oficial de https://js.stripe.com/v3/ (actualizar periódicamente)
// Para obtener: curl -s https://js.stripe.com/v3/ | openssl dgst -sha384 -binary | openssl base64
const STRIPE_JS_SRI = "'sha384-OTB72Jt9fd6GDztWrR5J8W1qXWJGkKGrGV2hNJlWl+A0YMS+3+iwcOJ5mW2U5P3O'";

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // ==========================================
  // HSTS: fuerza HTTPS por 2 años
  // ==========================================
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  // ==========================================
  // X-Frame-Options: previene clickjacking
  // ==========================================
  response.headers.set('X-Frame-Options', 'DENY');

  // ==========================================
  // X-Content-Type-Options: previene MIME sniffing
  // ==========================================
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // ==========================================
  // Referrer-Policy: limita información de referencia
  // ==========================================
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ==========================================
  // Permissions-Policy: restringe APIs del navegador
  // ==========================================
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );

  // ==========================================
  // CSP (Content Security Policy)
  // FASE 1: Report-Only (detecta violaciones sin bloquear)
  // Cambiar a enforcement después de validar en producción.
  //
  // Políticas anti-Magecart:
  // - script-src: WHITELIST estricta, nunca 'unsafe-inline' para scripts
  // - connect-src: solo api.stripe.com y dominio propio
  // - frame-src: solo stripe.com (iframes de Stripe Elements)
  // - img-src: self, data, cloudinary
  // - style-src: self + unsafe-inline (necesario para styled-components/ Tailwind)
  // - object-src: none (bloquea Flash/Java applets)
  // - base-uri: self (previene base tag injection)
  // - form-action: self (previene form hijacking)
  // - frame-ancestors: none (previene embedding en iframes maliciosos)
  // ==========================================
  const cspDirectives = [
    "default-src 'self'",
    // script-src: solo scripts de nuestro dominio, Stripe, y con SRI
    `script-src 'self' https://js.stripe.com ${STRIPE_JS_SRI}`,
    // connect-src: solo nuestro API y Stripe
    "connect-src 'self' https://api.stripe.com",
    // frame-src: solo Stripe (iframes de pago)
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    // img-src: self, data URIs, Cloudinary
    "img-src 'self' data: https://res.cloudinary.com",
    // style-src: self + unsafe-inline (necesario para Tailwind/shadcn inline styles)
    "style-src 'self' 'unsafe-inline'",
    // font-src: self y data (para icon fonts)
    "font-src 'self' data:",
    // object-src: none (bloquea plugins)
    "object-src 'none'",
    // base-uri: self (previene inyección de base tag)
    "base-uri 'self'",
    // form-action: self (previene redirección de formularios)
    "form-action 'self'",
    // frame-ancestors: none (clickjacking protection)
    "frame-ancestors 'none'",
    // upgrade-insecure-requests: fuerza HTTPS
    "upgrade-insecure-requests",
    // report-uri: endpoint para recibir violaciones
    "report-uri /api/csp-report",
  ].join('; ');

  // FASE 1: Report-Only (no bloquea, solo reporta violaciones)
  // TODO: Cambiar a 'Content-Security-Policy' después de validar en producción
  response.headers.set('Content-Security-Policy-Report-Only', cspDirectives);

  return response;
}

/**
 * Matcher: aplicar middleware en TODAS las rutas excepto archivos estáticos.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/ (API routes already have their own security headers)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
