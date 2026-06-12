import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if pathname contains uppercase letters (ignoring static assets and api)
  if (
    pathname !== pathname.toLowerCase() &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308); // Permanent Redirect
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.svg, icons.svg, mundial_smoke_bg.png (static public files)
     */
    '/((?!api|_next/static|_next/image|favicon.svg|icons.svg|mundial_smoke_bg.png).*)',
  ],
};
