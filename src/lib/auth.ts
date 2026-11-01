import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { connectDB, emailAddress, rateLimit } from './security';

export const authOptions: NextAuthOptions = {
  providers: [CredentialsProvider({
    name: 'Credentials',
    credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Senha', type: 'password' } },
    async authorize(credentials) {
      try {
        const email = emailAddress(credentials?.email);
        const password = credentials?.password;
        if (typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) return null;
        await rateLimit('login-global', 'all', 500);
        await rateLimit('login', email, 10);
        const user = await User.findOne({ email });
        // Perform bcrypt even for unknown accounts to reduce timing differences.
        const hash = user?.password || '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
        const valid = await bcrypt.compare(password, hash);
        if (!user?.password || !valid) return null;
        return { id: user._id.toString(), name: user.name, email: user.email };
      } catch { return null; }
    },
  })],
  session: { strategy: 'jwt', maxAge: 2 * 60 * 60 },
  pages: { signIn: '/auth/signin' },
  callbacks: {
    async jwt({ token, user }) {
      await connectDB();
      const account = await User.findById(user?.id || token.sub).select('sessionVersion');
      if (user) token.sessionVersion = account?.sessionVersion ?? 0;
      if (!account || (token.sessionVersion ?? 0) !== (account.sessionVersion ?? 0)) throw new Error('Session revoked');
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
export default authOptions;
