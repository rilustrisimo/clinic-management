import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login, /register, /offline (public pages)
     * - /api/register, /api/echo, /api/time, /api/telemetry, /api/sync (public APIs)  
     * - /_next/static, /_next/image (Next.js internals)
     * - /favicon.ico, /manifest.webmanifest (public files)
     * - Static files (.svg, .png, .jpg, etc.)
     */
    '/((?!login|register|offline|api/register|api/echo|api/time|api/telemetry|api/sync|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  console.log('[Middleware] Request:', pathname);

  // Allow public access to these routes
  const publicPaths = [
    '/login',
    '/register',
    '/offline',
    '/api/register',
    '/api/echo',
    '/api/time',
    '/api/telemetry',
    '/api/sync',  // Allow sync API for server-side syncing
    '/sw.js',
    '/clientside-sw-bridge.ts',
  ];

  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  
  if (isPublicPath) {
    console.log('[Middleware] Public path, allowing:', pathname);
    return NextResponse.next();
  }

  console.log('[Middleware] Protected path, checking auth:', pathname);

  let res = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const value = req.cookies.get(name)?.value;
          console.log(`[Middleware] Cookie get: ${name} = ${value ? 'exists' : 'missing'}`);
          return value;
        },
        set: (name: string, value: string, options: any) => {
          req.cookies.set({ name, value, ...options });
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          req.cookies.set({ name, value: '', ...options });
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  console.log('[Middleware] Auth check result:', { 
    hasUser: !!user, 
    userId: user?.id,
    error: error?.message 
  });
  
  if (!user) {
    console.log('[Middleware] No user found, redirecting to login');
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  console.log('[Middleware] User authenticated, allowing access');
  return res;
}
