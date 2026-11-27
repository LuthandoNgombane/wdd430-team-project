import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { getSessionUser, verifyCredentials } from '@/lib/users';

export const { auth, handlers, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = authConfig.callbacks.jwt(params);
      // After a profile change (unstable_update), reload the name and email
      // from the database so the header shows the new name. Data sent with
      // the update request itself is ignored, so a session can never hold
      // values that weren't saved.
      if (params.trigger === 'update' && token.sub) {
        const user = await getSessionUser(token.sub);
        if (user) {
          token.name = user.name;
          token.email = user.email;
        }
      }
      return token;
    },
  },
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