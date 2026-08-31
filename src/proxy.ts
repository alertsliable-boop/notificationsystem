import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(req) {
    // Redirect /dashboard root to /dashboard/overview
    if (req.nextUrl.pathname === '/') {
      const session = req.nextauth.token;
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;
        // Public routes — always allow
        const publicRoutes = ['/login', '/register', '/api/auth', '/api/health', '/api/webhooks', '/_next', '/favicon', '/terms', '/privacy-policy'];
        if (publicRoutes.some((r) => pathname.startsWith(r))) return true;
        // Marketing routes
        if (pathname === '/') return true;
        // Everything else requires auth
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
