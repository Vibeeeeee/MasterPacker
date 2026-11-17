import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of protected routes (require authentication)
const protectedRoutes = [
  '/items/new',
  '/items/.+',
  '/boxes/new',
  '/boxes/.+',
  '/tags/new',
  '/tags/.+',
  '/trips',
  '/settings',
  '/labels',
  '/api/items',
  '/api/boxes',
  '/api/tags',
  '/api/trips',
  '/api/attributes',
  '/api/snapshots',
  '/api/labels',
];

// List of public routes
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip if it's a public route ('/' must match exactly, otherwise every
  // path would be public since all paths start with '/')
  const isPublicRoute =
    pathname === '/' ||
    publicRoutes
      .filter(route => route !== '/')
      .some(route => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Edge runtime cannot use Prisma/bcryptjs/node:crypto, so we only check
  // for the presence of the session cookie here. The API routes and server
  // components perform the full session validation against the database.
  const token = request.cookies.get('sessionToken')?.value;

  // If no session cookie, redirect to login
  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // Check if read-only mode is enabled
  const configResponse = await fetch(`${request.nextUrl.origin}/api/config`);
  const config = await configResponse.json();

  if (config.readOnlyMode && request.method !== 'GET') {
    return NextResponse.json(
      { error: 'Read-only mode is enabled. Changes are not allowed.' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
