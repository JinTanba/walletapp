import { createCustomToken, verifyIdToken } from './firebase-admin-auth'

/**
 * 認証に関するビジネスロジックを管理するサービスクラス
 * サーバー側でのみ使用
 */
export class AuthService {
  /**
   * NextAuthセッション用のFirebaseカスタムトークンを生成
   * @param userId ユーザーID
   * @returns Firebase カスタムトークン
   */
  async generateFirebaseToken(userId: string): Promise<string> {
    return createCustomToken(userId)
  }

  /**
   * Firebase IDトークンを検証
   * @param token IDトークン
   * @returns デコードされたトークン
   */
  async validateFirebaseToken(token: string) {
    return verifyIdToken(token)
  }

  /**
   * ユーザーが有効かどうかを検証
   * 将来的な拡張: ブロックリストチェック、権限確認など
   * @param userId ユーザーID
   * @returns 有効な場合はtrue
   */
  async validateUser(userId: string): Promise<boolean> {
    // 基本的な検証ロジック
    if (!userId || userId.trim() === '') {
      return false
    }

    // 将来的な拡張ポイント:
    // - データベースでユーザー存在確認
    // - ブロックリストチェック
    // - 権限レベルの確認
    // - アカウントステータスの確認

    return true
  }
}

// シングルトンインスタンス
export const authService = new AuthService()
