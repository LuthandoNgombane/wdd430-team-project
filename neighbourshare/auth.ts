import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { verifyCredentials } from '@/lib/users';

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === 'string' ? credentials.email : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';
        if (!email || !password) return null;
        return verifyCredentials(email, password);
      },
    }),
  ],
});