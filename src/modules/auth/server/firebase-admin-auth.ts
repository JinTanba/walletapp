import { getAuth, Auth } from 'firebase-admin/auth'
import { getApps } from 'firebase-admin/app'

let adminAuth: Auth | null = null

/**
 * Firebase Admin Auth インスタンスを取得
 * サーバー側でのみ使用可能
 * @returns Auth インスタンス
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    const apps = getApps()
    if (apps.length === 0) {
      throw new Error('Firebase Admin app is not initialized. Please initialize it first.')
    }
    adminAuth = getAuth(apps[0])
  }
  return adminAuth
}

/**
 * カスタムトークンを生成
 * NextAuthセッションからFirebaseセッションへの変換に使用
 * @param uid ユーザーID
 * @returns カスタムトークン
 */
export async function createCustomToken(uid: string): Promise<string> {
  const auth = getAdminAuth()
  return auth.createCustomToken(uid)
}

/**
 * IDトークンを検証
 * @param token IDトークン
 * @returns デコードされたトークン
 */
export async function verifyIdToken(token: string) {
  const auth = getAdminAuth()
  return auth.verifyIdToken(token)
}
