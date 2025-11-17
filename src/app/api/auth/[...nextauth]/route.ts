import NextAuth, { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { authService } from "@/modules/auth/server/auth-service"

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('NextAuth signIn callback:', { user, account, profile })
      return true
    },
    async jwt({ token, user }) {
      // 初回ログイン時（userが存在する場合）にFirebaseカスタムトークンを生成
      if (user) {
        try {
          // 新しい認証サービスモジュールを使用
          const customToken = await authService.generateFirebaseToken(user.id)
          token.firebaseToken = customToken
          console.log('Firebase custom token created for user:', user.id)
        } catch (error) {
          console.error('Failed to create Firebase custom token:', error)
        }
      }
      return token
    },
    async session({ session, token }) {
      // セッションにFirebaseトークンを含める
      if (token.firebaseToken) {
        session.firebaseToken = token.firebaseToken as string
      }
      session.user.id = token.sub!
      return session
    }
  },
  pages: {
    signIn: '/', // ログインページのパス（カスタマイズ可能）
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
