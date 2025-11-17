import { getAdminDb } from '../firebase-admin-db'
import { UserData } from '../../types'

/**
 * ユーザーデータのFirestore操作を管理するリポジトリクラス
 * サーバー側でのみ使用
 */
export class UserRepository {
  private get db() {
    return getAdminDb()
  }

  private readonly collection = 'users'

  /**
   * 新規ユーザーを作成
   * @param userId ユーザーID (通常はemail)
   * @param userData ユーザーデータ
   */
  async create(userId: string, userData: Omit<UserData, 'createdAt' | 'attested'>): Promise<void> {
    await this.db.collection(this.collection).doc(userId).set({
      ...userData,
      createdAt: new Date().toISOString(),
      attested: false
    })
  }

  /**
   * ユーザーIDでユーザーデータを取得
   * @param userId ユーザーID
   * @returns ユーザーデータ、存在しない場合はnull
   */
  async findById(userId: string): Promise<UserData | null> {
    const doc = await this.db.collection(this.collection).doc(userId).get()

    if (!doc.exists) {
      return null
    }

    return doc.data() as UserData
  }

  /**
   * ウォレットアドレスでユーザーを検索
   * @param walletAddress ウォレットアドレス
   * @returns ユーザーデータ、存在しない場合はnull
   */
  async findByWalletAddress(walletAddress: string): Promise<UserData | null> {
    const snapshot = await this.db.collection(this.collection)
      .where('walletAddress', '==', walletAddress)
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    return snapshot.docs[0].data() as UserData
  }

  /**
   * 証明ステータスを更新
   * @param userId ユーザーID
   * @param txHash 証明トランザクションハッシュ
   */
  async updateAttestationStatus(
    userId: string,
    txHash: string
  ): Promise<void> {
    await this.db.collection(this.collection).doc(userId).update({
      attested: true,
      attestationTxHash: txHash,
      attestedAt: new Date().toISOString()
    })
  }

  /**
   * ユーザーデータを更新
   * @param userId ユーザーID
   * @param updates 更新するフィールド
   */
  async update(userId: string, updates: Partial<UserData>): Promise<void> {
    await this.db.collection(this.collection).doc(userId).update(updates)
  }

  /**
   * ユーザーを削除
   * @param userId ユーザーID
   */
  async delete(userId: string): Promise<void> {
    await this.db.collection(this.collection).doc(userId).delete()
  }

  /**
   * ユーザーが存在するかチェック
   * @param userId ユーザーID
   * @returns 存在する場合はtrue
   */
  async exists(userId: string): Promise<boolean> {
    const doc = await this.db.collection(this.collection).doc(userId).get()
    return doc.exists
  }
}

// シングルトンインスタンス
export const userRepository = new UserRepository()
