import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

function buildTargetUrl(request: NextRequest, path: string[]): string {
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const pathname = `/api/${path.join('/')}`;
  return `${baseUrl}${pathname}${request.nextUrl.search}`;
}

function buildForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const host = request.headers.get('host');
  if (host) {
    headers.set('x-forwarded-host', host);
  }
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));

  return headers;
}

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  const targetUrl = buildTargetUrl(request, context.params.path);
  const body = METHODS_WITHOUT_BODY.has(request.method) ? undefined : await request.arrayBuffer();

  return fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request),
    body,
    cache: 'no-store',
    redirect: 'manual',
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
