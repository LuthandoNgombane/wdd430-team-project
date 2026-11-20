// Next.js 16 "proxy" (previously called middleware). Runs before member-only
// pages render and redirects signed-out visitors to /signin.
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Keep in sync with MEMBER_ONLY_PATHS in auth.config.ts.
  matcher: ['/dashboard/:path*', '/listings/new/:path*', '/listings/:id/edit'],
};