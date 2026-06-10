import { NextRequest, NextResponse } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

export function middleware(request: NextRequest) {
  // This app has no Server Actions and no native <form> POSTs to page routes —
  // every mutation goes through /api/* via fetch (the matcher below excludes
  // /api). So any POST reaching a page route is illegitimate: scanners send
  // bogus `Next-Action` headers and truncated multipart bodies, which crash
  // Next's action dispatcher with "Cannot read properties of undefined
  // (reading 'workers')" and "Unexpected end of form". Reject them with a clean
  // 405 before they ever reach the dispatcher.
  if (request.method === 'POST') {
    return new NextResponse(null, { status: 405, headers: { Allow: 'GET' } });
  }

  if (!IS_PROD) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://avatars.githubusercontent.com https://github.githubassets.com https://user-images.githubusercontent.com https://raw.githubusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.github.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
