import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  where
} from 'firebase/firestore'
import { db } from '../firebase-client'
import { WalletData } from '../../types'

const COLLECTION_NAME = 'wallets'

/**
 * ウォレットデータのFirestore操作を管理するリポジトリクラス
 * クライアント側でのみ使用
 */
export class WalletRepository {
  /**
   * ウォレットデータを保存
   * @param wallet 保存するウォレットデータ
   */
  async save(wallet: WalletData): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, wallet.safeAddress)
    await setDoc(docRef, {
      ...wallet,
      updatedAt: new Date().toISOString()
    }, { merge: true })
  }

  /**
   * Safe アドレスでウォレットデータを取得
   * @param address Safe アドレス
   * @returns ウォレットデータ、存在しない場合はnull
   */
  async findByAddress(address: string): Promise<WalletData | null> {
    const docRef = doc(db, COLLECTION_NAME, address)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    return snapshot.data() as WalletData
  }

  /**
   * Google ユーザーIDで全ウォレットを取得
   * @param googleUserId Google ユーザーID
   * @returns ウォレットデータの配列
   */
  async findByGoogleUserId(googleUserId: string): Promise<WalletData[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('googleUserID', '==', googleUserId)
    )
    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => doc.data() as WalletData)
  }

  /**
   * 全ウォレットを取得（管理用、通常は使用しない）
   * @returns ウォレットデータの配列
   */
  async findAll(): Promise<WalletData[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    return snapshot.docs.map(doc => doc.data() as WalletData)
  }

  /**
   * デプロイステータスを更新
   * @param address Safe アドレス
   * @param txHash デプロイトランザクションハッシュ
   */
  async updateDeploymentStatus(
    address: string,
    txHash: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, address)
    await setDoc(docRef, {
      isDeployed: true,
      deployedAt: new Date().toISOString(),
      deploymentTxHash: txHash,
      updatedAt: new Date().toISOString()
    }, { merge: true })
  }

  /**
   * ウォレットデータを削除
   * @param address Safe アドレス
   */
  async delete(address: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, address)
    await deleteDoc(docRef)
  }

  /**
   * ウォレットデータの一部フィールドを更新
   * @param address Safe アドレス
   * @param updates 更新するフィールド
   */
  async update(address: string, updates: Partial<WalletData>): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, address)
    await setDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true })
  }
}

// シングルトンインスタンス
export const walletRepository = new WalletRepository()
