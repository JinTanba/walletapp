import { getAuth, signInWithCustomToken, signOut, User, Auth } from 'firebase/auth'
import { app } from '@/modules/database/client/firebase-client'

let auth: Auth

// Firebase Auth インスタンスの初期化
auth = getAuth(app)

/**
 * カスタムトークンを使用してFirebaseにサインイン
 * NextAuthセッションからFirebaseセッションへの変換に使用
 * @param customToken Firebase カスタムトークン
 * @returns Firebase ユーザー
 */
export async function signInWithFirebase(customToken: string): Promise<User> {
  const result = await signInWithCustomToken(auth, customToken)
  return result.user
}

/**
 * Firebaseからサインアウト
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth)
}

/**
 * 現在のFirebaseユーザーを取得
 * @returns 現在のユーザー、未認証の場合はnull
 */
export function getCurrentFirebaseUser(): User | null {
  return auth.currentUser
}

/**
 * Firebase Auth インスタンスを取得
 * @returns Auth インスタンス
 */
export function getFirebaseAuth(): Auth {
  return auth
}

export { auth }
