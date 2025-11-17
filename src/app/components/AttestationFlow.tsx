/**
 * サインアップ時のAttestation送信フローコンポーネント
 */

'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSafePasskeyHooks } from '@/app/hooks/safepasskeyFooks'
import { useAttestationOnSignup } from '@/app/hooks/useAttestationOnSignup'

export function AttestationFlow() {
  const { data: session } = useSession()
  const { safeAddress, isLoading: walletLoading } = useSafePasskeyHooks()
  const {
    submitAttestation,
    status,
    error,
    userOpHash,
    isLoading: attestationLoading,
    isAlreadyAttested,
  } = useAttestationOnSignup()

  useEffect(() => {
    // 自動でAttestationを送信する条件:
    // 1. ユーザーがログイン済み
    // 2. Safeウォレットが初期化済み
    // 3. まだAttestation送信中でない
    // 4. まだ成功していない
    if (
      session &&
      safe4337Pack &&
      safeAddress &&
      !walletLoading &&
      status === 'idle'
    ) {
      console.log('[ATTESTATION FLOW] Starting automatic attestation submission...')
      submitAttestation(safe4337Pack, safeAddress)
    }
  }, [session, safe4337Pack, safeAddress, walletLoading, status])

  // ローディング状態の表示
  if (walletLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">Initializing wallet...</p>
      </div>
    )
  }

  if (attestationLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">
          {status === 'fetching-signature'
            ? 'Getting ADMIN signature...'
            : 'Submitting attestation...'}
        </p>
      </div>
    )
  }

  // 既にAttestation済みの表示
  if (isAlreadyAttested) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800 font-semibold">✓ Wallet already verified!</p>
        <p className="text-blue-600 text-sm mt-1">
          This wallet has already been attested on the blockchain.
        </p>
      </div>
    )
  }

  // 成功状態の表示
  if (status === 'success' && userOpHash) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800 font-semibold">✓ Wallet verified successfully!</p>
        <p className="text-green-600 text-sm mt-1">
          Transaction: {userOpHash.slice(0, 10)}...{userOpHash.slice(-8)}
        </p>
      </div>
    )
  }

  // エラー状態の表示
  if (status === 'error' && error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 font-semibold">✗ Verification failed</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        {safe4337Pack && safeAddress && (
          <button
            onClick={() => submitAttestation(safe4337Pack, safeAddress)}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return null
}
