# LegitRegistry712 Library

EIP-712署名を使用してウォレットの正統性を証明するコントラクトとのインタラクションライブラリ

## 使い方

### 1. インスタンス作成

```typescript
import { createLegitRegistry, createLegitRegistryWithAdmin } from './legitRegistry'
import { LEGIT_REGISTRY_ADDRESS, RPC_URL } from '../../../constant'

// Read-onlyインスタンス
const registry = createLegitRegistry(LEGIT_REGISTRY_ADDRESS, RPC_URL)

// ADMIN署名機能付きインスタンス（サーバー側のみ）
const adminRegistry = createLegitRegistryWithAdmin(
  LEGIT_REGISTRY_ADDRESS,
  RPC_URL,
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' // ADMIN private key
)
```

### 2. Claimの作成と署名（ADMIN側）

```typescript
import { createClaim } from './legitRegistry'

// Claimを作成
const claim = await createClaim({
  appId: 'my-dapp',
  userHash: 'user@example.com', // 実際はpepper付きハッシュ
  wallet: '0x1234...', // 正統化したいウォレットアドレス
  expiresAt: calculateExpiry(365 * 24 * 60 * 60), // 1年後
})

// ADMIN署名を作成
const signature = await adminRegistry.signClaim(claim)

console.log('Claim:', claim)
console.log('Signature:', signature)
```

### 3. Attestationの提出（クライアント側）

```typescript
import { createWalletClient, custom } from 'viem'

// ユーザーのウォレットクライアント
const walletClient = createWalletClient({
  chain: sepolia,
  transport: custom(window.ethereum),
})

// Attestationを提出（ClaimとADMIN署名をコントラクトに送信）
const result = await registry.submitAttestation(claim, signature, walletClient)

console.log('UID:', result.uid)
console.log('Transaction:', result.transactionHash)
```

### 4. 正統性の確認

```typescript
// ウォレットが正統かチェック
const status = await registry.checkLegitStatus('0x1234...')

if (status.isLegit) {
  console.log('This wallet is legitimate!')
  console.log('Last UID:', status.lastUID)
} else {
  console.log('This wallet is not registered')
}
```

### 5. その他の機能

```typescript
// ADMINアドレスを取得
const admin = await registry.getAdmin()

// Nonceが使用済みかチェック
const nonce = registry.generateNonce()
const isUsed = await registry.isNonceUsed(nonce)

// デバッグ用: Claimのハッシュを取得
const claimHash = await registry.getClaimHash(claim)
const typedDigest = await registry.getTypedDigest(claim)

// デバッグ用: 署名からsignerを復元
const recoveredSigner = await registry.recoverSigner(claim, signature)
```

## 型定義

### Claim

```typescript
type Claim = {
  appId: Hex          // アプリケーションID（bytes32）
  userHash: Hex       // ユーザーハッシュ（PII削除済み、bytes32）
  wallet: Address     // 正統化するウォレットアドレス
  nonce: Hex          // 一度きりのnonce（bytes32）
  issuedAt: bigint    // 発行時刻（Unix timestamp）
  expiresAt: bigint   // 有効期限（Unix timestamp、0=無期限）
}
```

### LegitStatus

```typescript
type LegitStatus = {
  isLegit: boolean    // ウォレットが正統かどうか
  lastUID: Hex | null // 最後のAttestation UID（nullの場合は未登録）
}
```

### AttestationResult

```typescript
type AttestationResult = {
  uid: Hex            // Attestation UID
  transactionHash: Hash // トランザクションハッシュ
  wallet: Address     // 正統化されたウォレットアドレス
}
```

## ヘルパー関数

```typescript
// 現在のタイムスタンプを取得
const now = getCurrentTimestamp() // bigint

// 有効期限を計算（現在時刻 + 秒数）
const oneYearLater = calculateExpiry(365 * 24 * 60 * 60)

// 文字列からbytes32ハッシュを生成
const hash = await registry.stringToBytes32('my-string')

// ランダムなnonceを生成
const nonce = registry.generateNonce()
```

## セキュリティ注意事項

- **ADMIN秘密鍵**: 絶対にクライアント側で使用しないでください。サーバー側のみで使用してください。
- **Nonce**: 同じnonceを2回使用することはできません。必ず新しいnonceを生成してください。
- **有効期限**: 長期間有効な署名を発行する場合は、適切な有効期限を設定してください。

## フロー例

### オンボーディングフロー

1. ユーザーがWeb2認証（Email、Google等）でログイン
2. サーバー側でユーザーの正統性を確認
3. サーバー側でClaimを作成し、ADMIN署名を生成
4. クライアントがClaim + 署名をコントラクトに提出
5. ウォレットが正統として登録される

```
User → Web2 Auth → Server (verify + sign) → Client (submit) → Contract (verify)
```

## Contract Address

- Sepolia (local anvil): `0x16C632BafA9b3ce39bdCDdB00c3D486741685425`
- ADMIN: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
