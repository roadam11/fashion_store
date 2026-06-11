import type { NextAuthConfig } from "next-auth";

// Edge-safe config — no Node.js/DB imports.
// Used in proxy.ts (Edge Runtime) for JWT validation only.
// Full config (with Credentials provider + signIn callback) is in auth.ts.

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/login" },
  providers: [], // credentials provider is added in auth.ts (needs bcrypt + prisma)
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id!;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
};
