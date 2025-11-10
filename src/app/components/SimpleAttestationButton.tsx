/**
 * シンプルなAttestation送信ボタンコンポーネント
 */

'use client'

import { useSession } from 'next-auth/react'
import { useSafePasskeyHooks } from '@/app/hooks/safepasskeyFooks'
import { useSimpleAttestation } from '@/app/hooks/useSimpleAttestation'

export function SimpleAttestationButton() {
  const { data: session } = useSession()
  const { safeAddress, isLoading: walletLoading } = useSafePasskeyHooks()
  const {
    submitAttestation,
    status,
    error,
    txHash,
    isLoading,
    isSuccess,
    isError,
  } = useSimpleAttestation()

  const handleClick = async () => {
    if (!safeAddress) {
      alert('Wallet not initialized. Please create a wallet first.')
      return
    }

    await submitAttestation(safeAddress)
  }

  // ログインしていない場合
  if (!session) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <p className="text-gray-600">Please sign in first to verify your wallet</p>
      </div>
    )
  }

  // ウォレット初期化中
  if (walletLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800">Initializing wallet...</p>
      </div>
    )
  }

  // ウォレットが初期化されていない
  if (!safeAddress) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">Wallet not initialized</p>
      </div>
    )
  }

  // 処理中
  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800 font-semibold">Processing attestation...</p>
        <p className="text-blue-600 text-sm mt-1">
          Please wait while we verify your wallet on the blockchain.
        </p>
        <div className="mt-2 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800"></div>
          <span className="text-blue-600 text-sm">This may take a few seconds...</span>
        </div>
      </div>
    )
  }

  // 成功
  if (isSuccess && txHash) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800 font-semibold">✓ Wallet verified successfully!</p>
        <p className="text-green-600 text-sm mt-2">
          Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}
        </p>
      </div>
    )
  }

  // エラー
  if (isError && error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 font-semibold">✗ Verification failed</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={handleClick}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  // デフォルト: ボタン表示
  return (
    <div className="p-4 bg-white border border-gray-300 rounded">
      <p className="text-gray-800 font-semibold mb-2">Verify Your Wallet</p>
      <p className="text-gray-600 text-sm mb-3">
        Click the button below to verify your wallet address: {safeAddress.slice(0, 10)}...
        {safeAddress.slice(-8)}
      </p>
      <button
        onClick={handleClick}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Verify Wallet
      </button>
    </div>
  )
}
