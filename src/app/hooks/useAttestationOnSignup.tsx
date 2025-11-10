/**
 * サインアップ時にAttestationを自動送信するフック
 */

'use client'

import { useState } from 'react'
import { Safe4337Pack } from '@safe-global/relay-kit'
import { submitAttestationViaSafe } from '@/app/libs/submitAttestation'
import type { Claim } from '@/app/libs/legitRegistry'
import type { Hex } from 'viem'

export type AttestationStatus = 'idle' | 'fetching-signature' | 'submitting' | 'success' | 'already-attested' | 'error'

export function useAttestationOnSignup() {
  const [status, setStatus] = useState<AttestationStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [userOpHash, setUserOpHash] = useState<string | null>(null)

  /**
   * サインアップ時にAttestationを送信
   *
   * @param safe4337Pack - Safe4337Packインスタンス
   * @param walletAddress - ウォレットアドレス
   */
  const submitAttestation = async (
    safe4337Pack: Safe4337Pack,
    walletAddress: string
  ): Promise<string | null> => {
    try {
      setStatus('fetching-signature')
      setError(null)

      console.log('[ATTESTATION] Fetching ADMIN signature from backend...')

      // 1. バックエンドからADMIN署名を取得
      const response = await fetch('/api/attest/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get ADMIN signature')
      }

      const responseData = await response.json()

      // 既にAttestation済みの場合
      if (responseData.alreadyAttested) {
        console.log('[ATTESTATION] User already attested')
        setStatus('already-attested')
        return null
      }

      const { claim, signature } = responseData as {
        claim: Claim
        signature: Hex
      }

      console.log('[ATTESTATION] ADMIN signature received:', {
        claim,
        signature: signature.slice(0, 20) + '...',
      })

      setStatus('submitting')

      // 2. Safe4337Pack経由でAttestationを送信
      console.log('[ATTESTATION] Submitting attestation via Safe4337Pack...')
      const hash = await submitAttestationViaSafe(safe4337Pack, claim, signature)

      setStatus('success')
      setUserOpHash(hash)

      console.log('[ATTESTATION] Attestation submitted successfully!', {
        userOpHash: hash,
      })

      return hash
    } catch (err: any) {
      console.error('[ATTESTATION] Error submitting attestation:', err)
      setStatus('error')
      setError(err.message || 'Unknown error')
      return null
    }
  }

  /**
   * ステータスをリセット
   */
  const reset = () => {
    setStatus('idle')
    setError(null)
    setUserOpHash(null)
  }

  return {
    submitAttestation,
    status,
    error,
    userOpHash,
    reset,
    isLoading: status === 'fetching-signature' || status === 'submitting',
    isSuccess: status === 'success',
    isAlreadyAttested: status === 'already-attested',
    isError: status === 'error',
  }
}
