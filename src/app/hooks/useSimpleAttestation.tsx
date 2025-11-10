/**
 * シンプルなAttestation送信フック
 */

'use client'

import { useState } from 'react'

export type SimpleAttestationStatus = 'idle' | 'processing' | 'success' | 'error'

export function useSimpleAttestation() {
  const [status, setStatus] = useState<SimpleAttestationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  /**
   * Attestationを実行（ボタンクリック用）
   *
   * @param walletAddress - ウォレットアドレス
   * @param passkeyPublicKey - Passkey公開鍵（オプション）
   * @param passkeyCredentialId - PasskeyクレデンシャルID（オプション）
   */
  const submitAttestation = async (
    walletAddress: string,
    passkeyPublicKey?: string,
    passkeyCredentialId?: string
  ): Promise<{ success: boolean; txHash?: string }> => {
    try {
      setStatus('processing')
      setError(null)
      setTxHash(null)

      console.log('[ATTESTATION] Starting attestation process...')

      // バックエンドでAttestation送信
      const response = await fetch('/api/attest/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          passkeyPublicKey,
          passkeyCredentialId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit attestation')
      }

      const data = await response.json()
      console.log('[ATTESTATION] Attestation completed:', data)

      if (data.alreadyAttested) {
        console.log('[ATTESTATION] Already attested')
      }

      setTxHash(data.transactionHash || null)
      setStatus('success')
      console.log('[ATTESTATION] Attestation completed successfully')

      return {
        success: true,
        txHash: data.transactionHash || undefined,
      }
    } catch (err: any) {
      console.error('[ATTESTATION] Error:', err)
      setStatus('error')
      setError(err.message || 'Unknown error')
      return { success: false }
    }
  }

  /**
   * ステータスをリセット
   */
  const reset = () => {
    setStatus('idle')
    setError(null)
    setTxHash(null)
  }

  return {
    submitAttestation,
    status,
    error,
    txHash,
    reset,
    isLoading: status === 'processing',
    isSuccess: status === 'success',
    isError: status === 'error',
  }
}
