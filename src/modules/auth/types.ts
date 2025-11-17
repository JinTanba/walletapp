import { User as FirebaseUser } from 'firebase/auth'

/**
 * 統一された認証ユーザー型
 * NextAuthとFirebase Authの両方の情報を統合
 */
export interface AuthUser {
  id: string
  email: string | null
  name: string | null
  image?: string | null
  firebaseUser: FirebaseUser | null
}

/**
 * 認証状態
 */
export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
}
