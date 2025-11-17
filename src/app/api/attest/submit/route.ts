/**
 * Attestationを実行する統合APIエンドポイント
 *
 * POST /api/attest/submit
 * Body: {
 *   walletAddress: string,
 *   passkeyPublicKey: string,
 *   passkeyCredentialId: string
 * }
 *
 * 処理内容:
 * 1. Next.auth sessionで認証確認
 * 2. Firebaseに保存（passkey公開鍵、walletアドレス、user_id）
 * 3. Claimを作成・ADMIN署名
 * 4. ADMINウォレットからsubmitAttestationをトランザクション送信
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import {
  createLegitRegistryWithAdmin,
  createLegitRegistry,
  createClaim,
  calculateExpiry,
} from '@/app/libs/legitRegistry'
import { LEGIT_REGISTRY_ADDRESS, CONTRACT_RPC_URL } from '../../../../../constant'
import { createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import type { Hex, Address } from 'viem'
import { userRepository } from '@/modules/database/server/repositories/UserRepository'

// ADMIN秘密鍵
const ADMIN_PRIVATE_KEY = (process.env.ADMIN_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as Hex

// User Hash用のPepper
const USER_HASH_PEPPER = process.env.USER_HASH_PEPPER || 'default-pepper-change-in-production'

// LegitRegistry712 ABI（submitAttestation関数のみ）
const LEGIT_REGISTRY_ABI = [
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
] as const

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      )
    }

    // 2. リクエストボディを取得
    const body = await request.json()
    const { walletAddress, passkeyPublicKey, passkeyCredentialId } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      )
    }

    const userId = session.user.email || session.user.id

    console.log('[ATTEST] Starting attestation for user:', userId)

    // 3. 既にAttestation済みかチェック
    const registry = createLegitRegistry(LEGIT_REGISTRY_ADDRESS, CONTRACT_RPC_URL)
    const status = await registry.checkLegitStatus(walletAddress as Address)

    if (status.isLegit) {
      console.log('[ATTEST] Wallet already attested:', walletAddress)
      return NextResponse.json({
        success: true,
        alreadyAttested: true,
        message: 'Wallet already attested',
        lastUID: status.lastUID,
      })
    }

    // 4. データベースに保存（新しいリポジトリを使用）
    try {
      await userRepository.create(userId, {
        userId,
        email: session.user.email || null,
        name: session.user.name || null,
        walletAddress,
        passkeyPublicKey,
        passkeyCredentialId,
      })
      console.log('[ATTEST] User data saved to database')
    } catch (error) {
      console.error('[ATTEST] Database save error:', error)
      // データベースエラーは無視して続行
    }

    // 5. Claimを作成
    const userHashInput = `${userId}:${USER_HASH_PEPPER}`
    const claim = createClaim({
      appId: 'walletapp',
      userHash: userHashInput,
      wallet: walletAddress as Address,
      expiresAt: calculateExpiry(365 * 24 * 60 * 60), // 1年間有効
    })

    // 6. ADMIN署名を作成
    const adminRegistry = createLegitRegistryWithAdmin(
      LEGIT_REGISTRY_ADDRESS,
      CONTRACT_RPC_URL,
      ADMIN_PRIVATE_KEY
    )
    const signature = await adminRegistry.signClaim(claim)

    console.log('[ATTEST] Claim signed:', {
      wallet: walletAddress,
      signature: signature.slice(0, 20) + '...',
    })

    // 7. ADMINウォレットからsubmitAttestationを実行
    const adminAccount = privateKeyToAccount(ADMIN_PRIVATE_KEY)
    const walletClient = createWalletClient({
      account: adminAccount,
      chain: sepolia,
      transport: http(CONTRACT_RPC_URL),
    })

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(CONTRACT_RPC_URL),
    })

    console.log('[ATTEST] Submitting attestation transaction from ADMIN wallet...')

    // トランザクションをシミュレート
    const { request: txRequest } = await publicClient.simulateContract({
      address: LEGIT_REGISTRY_ADDRESS,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'submitAttestation',
      args: [claim, signature],
      account: adminAccount,
    })

    // トランザクションを送信
    const hash = await walletClient.writeContract(txRequest)

    console.log('[ATTEST] Attestation transaction sent:', hash)

    // トランザクションの完了を待つ
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    console.log('[ATTEST] Attestation transaction confirmed:', {
      hash,
      status: receipt.status,
    })

    // 8. データベースを更新（attested: true）
    try {
      await userRepository.updateAttestationStatus(userId, hash)
      console.log('[ATTEST] Database updated: attested = true')
    } catch (error) {
      console.error('[ATTEST] Database update error:', error)
      // データベース更新失敗は無視（コントラクトには記録済み）
    }

    return NextResponse.json({
      success: true,
      isNewAttestation: true,
      transactionHash: hash,
      walletAddress,
      message: 'Attestation completed successfully',
    })
  } catch (error: any) {
    console.error('[ATTEST] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit attestation', details: error.message },
      { status: 500 }
    )
  }
}
