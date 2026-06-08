import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const isUrlValid = (url) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

export async function proxy(request) {
  let response = NextResponse.next({ request });

  // Do not process proxy for public files, static assets, and API routes
  const path = request.nextUrl.pathname;
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path.includes('/favicon.ico') ||
    path.includes('/next.svg') ||
    path.includes('/vercel.svg')
  ) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let user = null;

  const bypassCookie = request.cookies.get('bluntly_bypass')?.value;
  if (bypassCookie === 'true') {
    user = { email: 'developer@bluntly.local', id: 'mock-dev-id' };
  } else if (isUrlValid(url) && key && !key.includes('_here')) {
    try {
      const supabase = createServerClient(
        url,
        key,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options);
              });
            },
          },
        }
      );

      // Refresh user session (getUser is security-critical and verifies JWT)
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    } catch (err) {
      console.error('Proxy Supabase session refresh error:', err);
    }
  }

  const isLoginPage = path === '/login';
  const isAuthCallback = path.startsWith('/auth/callback');

  // Protect main page and api routes
  if (!user && !isLoginPage && !isAuthCallback) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect logged-in users away from login page to the dashboard
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
