/**
 * Safe4337Pack経由でAttestationを送信するヘルパー
 */

import { Safe4337Pack } from '@safe-global/relay-kit'
import { encodeFunctionData } from 'viem'
import type { Hex, Address } from 'viem'
import { executeTx } from './executeTx'
import { LEGIT_REGISTRY_ADDRESS } from '../../../constant'
import type { Claim } from './legitRegistry'

/**
 * submitAttestation関数のトランザクションデータをエンコード
 */
export function encodeSubmitAttestationData(
  claim: Claim,
  adminSignature: Hex
): Hex {
  return encodeFunctionData({
    abi: [
      {
        "inputs": [
          {
            "components": [
              { "internalType": "bytes32", "name": "appId", "type": "bytes32" },
              { "internalType": "bytes32", "name": "userHash", "type": "bytes32" },
              { "internalType": "address", "name": "wallet", "type": "address" },
              { "internalType": "bytes32", "name": "nonce", "type": "bytes32" },
              { "internalType": "uint64", "name": "issuedAt", "type": "uint64" },
              { "internalType": "uint64", "name": "expiresAt", "type": "uint64" }
            ],
            "internalType": "struct LegitRegistry712.Claim",
            "name": "c",
            "type": "tuple"
          },
          { "internalType": "bytes", "name": "adminSignature", "type": "bytes" }
        ],
        "name": "submitAttestation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ],
    functionName: 'submitAttestation',
    args: [claim, adminSignature]
  }) as Hex
}

/**
 * Safe4337Pack経由でAttestationを送信
 *
 * @param safe4337Pack - Safe4337Packインスタンス
 * @param claim - Attestation用のClaim
 * @param adminSignature - ADMIN署名
 * @param contractAddress - LegitRegistry712コントラクトアドレス（デフォルト: LEGIT_REGISTRY_ADDRESS）
 * @returns UserOperation hash
 */
export async function submitAttestationViaSafe(
  safe4337Pack: Safe4337Pack,
  claim: Claim,
  adminSignature: Hex,
  contractAddress: Address = LEGIT_REGISTRY_ADDRESS
): Promise<string> {
  console.log('[ATTEST] Submitting attestation via Safe4337Pack:', {
    wallet: claim.wallet,
    appId: claim.appId,
    contractAddress,
  })

  // トランザクションデータをエンコード
  const data = encodeSubmitAttestationData(claim, adminSignature)

  console.log('[ATTEST] Encoded transaction data:', {
    data: data.slice(0, 20) + '...',
    dataLength: data.length,
  })

  // Safe4337Pack経由でUserOperationとして実行
  const userOpHash = await executeTx(safe4337Pack, {
    to: contractAddress,
    data,
    value: '0'
  })

  console.log('[ATTEST] Attestation submitted successfully!', {
    userOpHash,
    wallet: claim.wallet,
  })

  return userOpHash
}

/**
 * 複数のAttestationを一度に送信（バッチ）
 *
 * 注意: Safe4337Packはバッチトランザクションをサポートしていますが、
 * 現在のexecuteTx実装では単一トランザクションのみ対応しています。
 * 必要に応じてexecuteTxを拡張してください。
 */
export async function submitMultipleAttestationsViaSafe(
  safe4337Pack: Safe4337Pack,
  attestations: Array<{ claim: Claim; signature: Hex }>,
  contractAddress: Address = LEGIT_REGISTRY_ADDRESS
): Promise<string[]> {
  console.log(`[ATTEST] Submitting ${attestations.length} attestations via Safe4337Pack`)

  const results: string[] = []

  for (const { claim, signature } of attestations) {
    const userOpHash = await submitAttestationViaSafe(
      safe4337Pack,
      claim,
      signature,
      contractAddress
    )
    results.push(userOpHash)
  }

  console.log(`[ATTEST] All ${attestations.length} attestations submitted successfully`)

  return results
}
