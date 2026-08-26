import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Line from "next-auth/providers/line";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Line({
      clientId: process.env.AUTH_LINE_ID,
      clientSecret: process.env.AUTH_LINE_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? null,
          image: profile.picture ?? null,
          email: null,
        };
      },
    }),
  ],
});
