/**
 * ADMIN署名を作成するAPIエンドポイント
 *
 * POST /api/attest/sign
 * Body: { walletAddress: string }
 * Returns: { claim: Claim, signature: Hex } | { alreadyAttested: true }
 *
 * セキュリティ:
 * - Next.auth sessionで認証済みユーザーのみアクセス可能
 * - 既にAttestation済みのユーザーには署名を発行しない（コントラクトで確認）
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
import { LEGIT_REGISTRY_ADDRESS, RPC_URL } from '../../../../../constant'
import type { Hex, Address } from 'viem'

// ADMIN秘密鍵（環境変数から取得、またはAnvilデフォルト）
const ADMIN_PRIVATE_KEY = (process.env.ADMIN_PRIVATE_KEY ||
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80') as Hex

// User Hash用のPepper（セキュリティ強化）
const USER_HASH_PEPPER = process.env.USER_HASH_PEPPER || 'default-pepper-change-in-production'

/**
 * コントラクトで既にAttestation済みかチェック
 */
async function checkAttestationStatus(walletAddress: Address): Promise<boolean> {
  try {
    const registry = createLegitRegistry(LEGIT_REGISTRY_ADDRESS, RPC_URL)
    const status = await registry.checkLegitStatus(walletAddress)

    if (status.isLegit) {
      console.log('[ATTEST] Wallet already attested (Contract):', walletAddress)
      return true
    }
  } catch (error) {
    console.error('[ATTEST] Contract check error:', error)
    // コントラクトチェックエラーは無視して署名発行に進む
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      )
    }

    // リクエストボディを取得
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      )
    }

    // User ID
    const userId = session.user.email || session.user.id

    // 既にAttestation済みかチェック（コントラクトのみ）
    const isAttested = await checkAttestationStatus(walletAddress as Address)

    if (isAttested) {
      console.log('[ATTEST] Wallet already attested:', userId)
      return NextResponse.json({
        alreadyAttested: true,
        message: 'Wallet already attested',
      })
    }

    // User Hashを生成
    const userHashInput = `${userId}:${USER_HASH_PEPPER}`

    console.log('[ATTEST] Creating claim for NEW user:', {
      userId,
      walletAddress,
    })

    // Claimを作成
    const claim = createClaim({
      appId: 'walletapp',
      userHash: userHashInput,
      wallet: walletAddress as Address,
      expiresAt: calculateExpiry(365 * 24 * 60 * 60), // 1年間有効
    })

    // ADMIN署名を作成
    const registry = createLegitRegistryWithAdmin(
      LEGIT_REGISTRY_ADDRESS,
      RPC_URL,
      ADMIN_PRIVATE_KEY
    )

    const signature = await registry.signClaim(claim)

    console.log('[ATTEST] Claim signed successfully for NEW user:', {
      userId,
      signature: signature.slice(0, 20) + '...',
    })

    return NextResponse.json({
      claim,
      signature,
      message: 'Claim signed successfully by ADMIN',
      isNewAttestation: true,
    })
  } catch (error: any) {
    console.error('[ATTEST] Error signing claim:', error)
    return NextResponse.json(
      { error: 'Failed to sign claim', details: error.message },
      { status: 500 }
    )
  }
}
