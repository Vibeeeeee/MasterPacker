import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from './lib/auth';

// List of protected routes (require authentication)
const protectedRoutes = [
  '/items/new',
  '/items/.+',
  '/boxes/new',
  '/boxes/.+',
  '/tags/new',
  '/tags/.+',
  '/settings',
  '/api/items',
  '/api/boxes',
  '/api/tags',
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

  // Skip if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtected) {
    return NextResponse.next();
  }

  // Get session
  const session = await getSession();

  // If no session, redirect to login
  if (!session) {
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
