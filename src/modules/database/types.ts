import { PasskeyArgType } from '@safe-global/protocol-kit'

/**
 * ウォレットデータ型定義
 * Firestoreの'wallets'コレクションに保存されるデータ構造
 */
export interface WalletData {
  safeAddress: string
  passkey: PasskeyArgType
  googleUserID: string | null
  createdAt: string
  isDeployed: boolean
  passkeyData: {
    rawId: string
    coordinates: { x: string; y: string }
  }
  deployedAt?: string
  deploymentTxHash?: string
  updatedAt?: string
}

/**
 * ユーザーデータ型定義
 * Firestoreの'users'コレクション(サーバー側のみ)に保存されるデータ構造
 */
export interface UserData {
  userId: string
  email: string | null
  name: string | null
  walletAddress: string
  passkeyPublicKey: string
  passkeyCredentialId: string
  createdAt: string
  attested: boolean
  attestationTxHash?: string
  attestedAt?: string
}

/**
 * LocalStorageに保存されるウォレットデータの簡易版
 */
export type LocalWalletData = WalletData
