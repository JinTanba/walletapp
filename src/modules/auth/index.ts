// 型定義のエクスポート
export type { AuthUser, AuthState } from './types'

// クライアント側認証
export { useAuth } from './client/useAuth'
export {
  signInWithFirebase,
  signOutFirebase,
  getCurrentFirebaseUser,
  getFirebaseAuth,
  auth
} from './client/firebase-auth'

// サーバー側認証 (サーバーコンポーネント/API routesでのみ使用)
export { AuthService, authService } from './server/auth-service'
export {
  getAdminAuth,
  createCustomToken,
  verifyIdToken
} from './server/firebase-admin-auth'
