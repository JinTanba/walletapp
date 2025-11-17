'use client'

import { useState, useCallback } from 'react'
import { walletRepository } from '../repositories/WalletRepository'
import { localStorageRepository } from '../repositories/LocalStorageRepository'
import { WalletData } from '../../types'

/**
 * ウォレットデータのストレージ操作を管理するフック
 * LocalStorageとFirebaseのデュアルストレージ戦略を実装
 */
export function useWalletStorage(googleUserId: string | null) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * デュアルストレージ保存 (LocalStorage + Firebase)
   * @param wallet 保存するウォレットデータ
   */
  const saveWallet = useCallback(async (wallet: WalletData): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. LocalStorageに即座に保存 (高速、オフライン対応)
      localStorageRepository.add(wallet)

      // 2. Firebaseに保存 (クラウドバックアップ、複数デバイス同期)
      await walletRepository.save(wallet)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save wallet')
      setError(error)
      console.error('Failed to save wallet:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * ウォレット読み込み (LocalStorage優先、Firebase fallback)
   * @returns ウォレットデータの配列
   */
  const loadWallets = useCallback(async (): Promise<WalletData[]> => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. LocalStorageから読み込み (高速)
      let wallets = localStorageRepository.load()

      // Google User IDでフィルタ (指定されている場合)
      if (googleUserId) {
        wallets = wallets.filter(w => w.googleUserID === googleUserId)
      }

      // 2. LocalStorageが空ならFirebaseから取得
      if (wallets.length === 0 && googleUserId) {
        wallets = await walletRepository.findByGoogleUserId(googleUserId)

        // Firebaseから取得したデータをLocalStorageに同期
        if (wallets.length > 0) {
          // 既存のLocalStorageデータを取得
          const existingWallets = localStorageRepository.load()
          // 新しいデータを追加（重複排除）
          const mergedWallets = [...existingWallets]
          wallets.forEach(wallet => {
            if (!mergedWallets.some(w => w.safeAddress === wallet.safeAddress)) {
              mergedWallets.push(wallet)
            }
          })
          localStorageRepository.save(mergedWallets)
        }
      }

      return wallets
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load wallets')
      setError(error)
      console.error('Failed to load wallets:', error)
      // エラーでも空配列を返す (フォールバック)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [googleUserId])

  /**
   * 特定アドレスのウォレット取得
   * @param address Safe アドレス
   * @returns ウォレットデータ、存在しない場合はnull
   */
  const getWallet = useCallback(async (address: string): Promise<WalletData | null> => {
    setIsLoading(true)
    setError(null)

    try {
      // LocalStorageから取得を試行
      let wallet = localStorageRepository.findByAddress(address)

      // LocalStorageになければFirebaseから取得
      if (!wallet) {
        wallet = await walletRepository.findByAddress(address)

        // Firebaseにあった場合、LocalStorageに同期
        if (wallet) {
          localStorageRepository.add(wallet)
        }
      }

      return wallet
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get wallet')
      setError(error)
      console.error('Failed to get wallet:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * ウォレット削除 (両方のストレージから)
   * @param address Safe アドレス
   */
  const deleteWallet = useCallback(async (address: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // LocalStorageとFirebase両方から削除
      localStorageRepository.delete(address)
      await walletRepository.delete(address)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete wallet')
      setError(error)
      console.error('Failed to delete wallet:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * デプロイステータス更新 (両方のストレージ)
   * @param address Safe アドレス
   * @param txHash デプロイトランザクションハッシュ
   */
  const updateDeployment = useCallback(async (
    address: string,
    txHash: string
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Firebaseを更新
      await walletRepository.updateDeploymentStatus(address, txHash)

      // LocalStorageも更新
      localStorageRepository.update(address, {
        isDeployed: true,
        deployedAt: new Date().toISOString(),
        deploymentTxHash: txHash
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update deployment status')
      setError(error)
      console.error('Failed to update deployment status:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * ウォレットデータの一部フィールドを更新
   * @param address Safe アドレス
   * @param updates 更新するフィールド
   */
  const updateWallet = useCallback(async (
    address: string,
    updates: Partial<WalletData>
  ): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // Firebase更新
      await walletRepository.update(address, updates)

      // LocalStorage更新
      localStorageRepository.update(address, updates)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update wallet')
      setError(error)
      console.error('Failed to update wallet:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    saveWallet,
    loadWallets,
    getWallet,
    deleteWallet,
    updateDeployment,
    updateWallet,
    isLoading,
    error
  }
}
