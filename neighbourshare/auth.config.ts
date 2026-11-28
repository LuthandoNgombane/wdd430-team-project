import type { NextAuthConfig } from 'next-auth';

export const MEMBER_ONLY_PATHS = ['/dashboard', '/listings/new', '/profile'];

export function isMemberOnlyPath(pathname: string): boolean {
  // /listings/<id>/edit is member-only too (the owner check happens on the page).
  if (/^\/listings\/[^/]+\/edit\/?$/.test(pathname)) return true;
  return MEMBER_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export const authConfig = {
  pages: {
    signIn: '/signin',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request }) {
      if (isMemberOnlyPath(request.nextUrl.pathname)) return Boolean(auth?.user);
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;