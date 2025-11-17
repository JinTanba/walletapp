// 型定義のエクスポート
export type { WalletData, UserData, LocalWalletData } from './types'

// クライアント側リポジトリ
export { WalletRepository, walletRepository } from './client/repositories/WalletRepository'
export { LocalStorageRepository, localStorageRepository } from './client/repositories/LocalStorageRepository'

// クライアント側Firebase
export { db, app } from './client/firebase-client'

// サーバー側リポジトリ (サーバーコンポーネント/API routesでのみ使用)
export { UserRepository, userRepository } from './server/repositories/UserRepository'
export { getAdminDb } from './server/firebase-admin-db'
