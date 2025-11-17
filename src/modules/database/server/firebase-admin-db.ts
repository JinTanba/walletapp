import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getApps } from 'firebase-admin/app'

let adminDb: Firestore | null = null

/**
 * Firebase Admin Firestore インスタンスを取得
 * サーバー側でのみ使用可能
 * @returns Firestore インスタンス
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    const apps = getApps()
    if (apps.length === 0) {
      throw new Error('Firebase Admin app is not initialized. Please initialize it first.')
    }
    adminDb = getFirestore(apps[0])
  }
  return adminDb
}
