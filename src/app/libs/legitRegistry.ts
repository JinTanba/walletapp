/**
 * LegitRegistry712 Contract Library
 *
 * EIP-712署名を使用してウォレットの正統性を証明するコントラクトとのインタラクション
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Address,
  Hex,
  Hash,
  keccak256,
  toHex
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

// ================================================================================
// Types
// ================================================================================

export type Claim = {
  appId: Hex
  userHash: Hex
  wallet: Address
  nonce: Hex
  issuedAt: bigint
  expiresAt: bigint
}

export type AttestationResult = {
  uid: Hex
  transactionHash: Hash
  wallet: Address
}

export type LegitStatus = {
  isLegit: boolean
  lastUID: Hex | null
}

// ================================================================================
// Constants
// ================================================================================

const LEGIT_REGISTRY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "adminSigner", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "uid", "type": "bytes32" },
      { "indexed": true, "internalType": "address", "name": "wallet", "type": "address" },
      { "indexed": false, "internalType": "bytes32", "name": "appId", "type": "bytes32" },
      { "indexed": false, "internalType": "bytes32", "name": "userHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint64", "name": "issuedAt", "type": "uint64" },
      { "indexed": false, "internalType": "uint64", "name": "expiresAt", "type": "uint64" },
      { "indexed": false, "internalType": "bytes32", "name": "nonce", "type": "bytes32" },
      { "indexed": false, "internalType": "address", "name": "admin", "type": "address" },
      { "indexed": false, "internalType": "bytes", "name": "adminSignature", "type": "bytes" }
    ],
    "name": "Attested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "wallet", "type": "address" }
    ],
    "name": "Revoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ADMIN",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CLAIM_TYPEHASH",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
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
      }
    ],
    "name": "hashClaim",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isLegit",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "lastUID",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
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
    "name": "recoverSigner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
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
  },
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
      }
    ],
    "name": "typedDigest",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "name": "usedNonce",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// EIP-712 Domain
const EIP712_DOMAIN = {
  name: 'UryuDAO',
  version: '1',
  chainId: 11155111, // Sepolia
} as const

// EIP-712 Types
const EIP712_TYPES = {
  Claim: [
    { name: 'appId', type: 'bytes32' },
    { name: 'userHash', type: 'bytes32' },
    { name: 'wallet', type: 'address' },
    { name: 'nonce', type: 'bytes32' },
    { name: 'issuedAt', type: 'uint64' },
    { name: 'expiresAt', type: 'uint64' },
  ],
} as const

// ================================================================================
// LegitRegistry712 Class
// ================================================================================

export class LegitRegistry712 {
  private contractAddress: Address
  private rpcUrl: string
  private publicClient: PublicClient
  private adminPrivateKey?: Hex

  constructor(contractAddress: Address, rpcUrl: string, adminPrivateKey?: Hex) {
    this.contractAddress = contractAddress
    this.rpcUrl = rpcUrl
    this.adminPrivateKey = adminPrivateKey

    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    })
  }

  // ================================================================================
  // Signature Creation (ADMIN側)
  // ================================================================================

  /**
   * Claimに対してADMINの署名を作成
   */
  async signClaim(claim: Claim): Promise<Hex> {
    if (!this.adminPrivateKey) {
      throw new Error('Admin private key is required to sign claims')
    }

    const account = privateKeyToAccount(this.adminPrivateKey)

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(this.rpcUrl),
    })

    const signature = await walletClient.signTypedData({
      domain: {
        ...EIP712_DOMAIN,
        verifyingContract: this.contractAddress,
      },
      types: EIP712_TYPES,
      primaryType: 'Claim',
      message: {
        appId: claim.appId,
        userHash: claim.userHash,
        wallet: claim.wallet,
        nonce: claim.nonce,
        issuedAt: claim.issuedAt,
        expiresAt: claim.expiresAt,
      },
    })

    return signature
  }

  /**
   * ランダムなnonceを生成
   */
  generateNonce(): Hex {
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    return `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex
  }

  /**
   * 文字列からbytes32ハッシュを生成（Keccak256）
   *
   * 例: "my-app" → 0xabc123...（32バイトのハッシュ）
   */
  stringToBytes32(str: string): Hex {
    return keccak256(toHex(str))
  }

  // ================================================================================
  // Contract Interactions
  // ================================================================================

  /**
   * Attestationを提出（コントラクトにClaim + 署名を送信）
   */
  async submitAttestation(
    claim: Claim,
    adminSignature: Hex,
    walletClient: WalletClient
  ): Promise<AttestationResult> {
    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'submitAttestation',
      args: [claim, adminSignature],
      account: walletClient.account!,
    })

    const hash = await walletClient.writeContract(request)

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash })

    // イベントログからUIDを取得
    const attestedEvent = receipt.logs.find(log =>
      log.topics[0] === '0x...' // Attested event signature
    )

    const uid = attestedEvent?.topics[1] || '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex

    console.log('Attested Event:', attestedEvent)
    console.log('UID:', uid)
    console.log('Transaction Hash:', hash)
    console.log('Wallet:', claim.wallet)

    return {
      uid,
      transactionHash: hash,
      wallet: claim.wallet,
    }
  }

  /**
   * ウォレットの正統性を確認
   */
  async checkLegitStatus(wallet: Address): Promise<LegitStatus> {
    const [isLegit, lastUID] = await Promise.all([
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: LEGIT_REGISTRY_ABI,
        functionName: 'isLegit',
        args: [wallet],
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: LEGIT_REGISTRY_ABI,
        functionName: 'lastUID',
        args: [wallet],
      }),
    ])

    return {
      isLegit: isLegit as boolean,
      lastUID: lastUID === '0x0000000000000000000000000000000000000000000000000000000000000000'
        ? null
        : lastUID as Hex,
    }
  }

  /**
   * nonceが使用済みかチェック
   */
  async isNonceUsed(nonce: Hex): Promise<boolean> {
    const used = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'usedNonce',
      args: [nonce],
    })

    return used as boolean
  }

  /**
   * ADMINアドレスを取得
   */
  async getAdmin(): Promise<Address> {
    const admin = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'ADMIN',
    })

    return admin as Address
  }

  /**
   * Claimのハッシュを取得（デバッグ用）
   */
  async getClaimHash(claim: Claim): Promise<Hex> {
    const hash = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'hashClaim',
      args: [claim],
    })

    return hash as Hex
  }

  /**
   * EIP-712 Typed Digestを取得（デバッグ用）
   */
  async getTypedDigest(claim: Claim): Promise<Hex> {
    const digest = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'typedDigest',
      args: [claim],
    })

    return digest as Hex
  }

  /**
   * 署名からsignerを復元（デバッグ用）
   */
  async recoverSigner(claim: Claim, signature: Hex): Promise<Address> {
    const signer = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: LEGIT_REGISTRY_ABI,
      functionName: 'recoverSigner',
      args: [claim, signature],
    })

    return signer as Address
  }
}

// ================================================================================
// Factory Functions
// ================================================================================

/**
 * LegitRegistry712インスタンスを作成（read-only）
 */
export function createLegitRegistry(
  contractAddress: Address,
  rpcUrl: string
): LegitRegistry712 {
  return new LegitRegistry712(contractAddress, rpcUrl)
}

/**
 * LegitRegistry712インスタンスを作成（ADMIN署名機能付き）
 */
export function createLegitRegistryWithAdmin(
  contractAddress: Address,
  rpcUrl: string,
  adminPrivateKey: Hex
): LegitRegistry712 {
  return new LegitRegistry712(contractAddress, rpcUrl, adminPrivateKey)
}

// ================================================================================
// Helper Functions
// ================================================================================

/**
 * Claimを作成するヘルパー
 */
export function createClaim(params: {
  appId: string
  userHash: string
  wallet: Address
  nonce?: Hex
  issuedAt?: bigint
  expiresAt?: bigint
}): Claim {
  const registry = new LegitRegistry712('0x0000000000000000000000000000000000000000' as Address, '')

  return {
    appId: registry.stringToBytes32(params.appId),
    userHash: registry.stringToBytes32(params.userHash),
    wallet: params.wallet,
    nonce: params.nonce || registry.generateNonce(),
    issuedAt: params.issuedAt || BigInt(Math.floor(Date.now() / 1000)),
    expiresAt: params.expiresAt || 0n, // 0 = never expires
  }
}

/**
 * 現在のタイムスタンプを取得
 */
export function getCurrentTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000))
}

/**
 * 有効期限を計算（現在時刻 + 秒数）
 */
export function calculateExpiry(seconds: number): bigint {
  return getCurrentTimestamp() + BigInt(seconds)
}
