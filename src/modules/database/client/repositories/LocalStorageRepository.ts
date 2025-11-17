import { WalletData } from '../../types'

const STORAGE_KEY = 'safe-wallet-data'

/**
 * LocalStorageでウォレットデータを管理するリポジトリクラス
 * オフラインアクセスとFirebaseのフォールバックとして機能
 */
export class LocalStorageRepository {
  /**
   * ウォレットデータをLocalStorageに保存
   * @param wallets 保存するウォレットデータの配列
   */
  save(wallets: WalletData[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
      // LocalStorage容量オーバーの場合など、エラーをログに記録
    }
  }

  /**
   * LocalStorageからウォレットデータを読み込み
   * @returns ウォレットデータの配列、エラーの場合は空配列
   */
  load(): WalletData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) {
        return []
      }

      return JSON.parse(data) as WalletData[]
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
      return []
    }
  }

  /**
   * 単一のウォレットデータを追加
   * @param wallet 追加するウォレットデータ
   */
  add(wallet: WalletData): void {
    const wallets = this.load()

    // 重複チェック
    const exists = wallets.some(w => w.safeAddress === wallet.safeAddress)
    if (exists) {
      // 既存データを更新
      this.update(wallet.safeAddress, wallet)
      return
    }

    wallets.push(wallet)
    this.save(wallets)
  }

  /**
   * 特定アドレスのウォレットデータを取得
   * @param address Safe アドレス
   * @returns ウォレットデータ、存在しない場合はnull
   */
  findByAddress(address: string): WalletData | null {
    const wallets = this.load()
    return wallets.find(w => w.safeAddress === address) || null
  }

  /**
   * Google ユーザーIDでウォレットデータをフィルタ
   * @param googleUserId Google ユーザーID
   * @returns フィルタされたウォレットデータの配列
   */
  findByGoogleUserId(googleUserId: string): WalletData[] {
    const wallets = this.load()
    return wallets.filter(w => w.googleUserID === googleUserId)
  }

  /**
   * 特定アドレスのウォレットデータを更新
   * @param address Safe アドレス
   * @param updates 更新するデータ
   */
  update(address: string, updates: Partial<WalletData>): void {
    const wallets = this.load()
    const index = wallets.findIndex(w => w.safeAddress === address)

    if (index === -1) {
      console.warn(`Wallet with address ${address} not found in localStorage`)
      return
    }

    wallets[index] = {
      ...wallets[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.save(wallets)
  }

  /**
   * 特定アドレスのウォレットデータを削除
   * @param address Safe アドレス
   */
  delete(address: string): void {
    const wallets = this.load()
    const filtered = wallets.filter(w => w.safeAddress !== address)
    this.save(filtered)
  }

  /**
   * 全ウォレットデータをクリア
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }

  /**
   * LocalStorageが利用可能かチェック
   * @returns 利用可能な場合はtrue
   */
  isAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}

// シングルトンインスタンス
export const localStorageRepository = new LocalStorageRepository()
