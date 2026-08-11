import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getAdminClient } from "@/lib/supabase";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = getAdminClient();
        const { data: user, error } = await supabase
          .from('User')
          .select('*, memberships:Membership(*)')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to port 3001 instead of 3000
      const correctBaseUrl = baseUrl.replace(':3000', ':3001');
      
      // If signing out, go to landing page
      if (url.includes('signout') || url.includes('signOut')) {
        return correctBaseUrl;
      }
      
      // If the url is relative, append it to the correct base URL
      if (url.startsWith('/')) {
        return `${correctBaseUrl}${url}`;
      }
      
      // If the url is already absolute and on the same origin
      if (url.startsWith(baseUrl) || url.startsWith(correctBaseUrl)) {
        return url.replace(':3000', ':3001');
      }
      
      return correctBaseUrl;
    },
  },
};
