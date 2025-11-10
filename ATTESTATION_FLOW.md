# Attestation Flow - 自動ウォレット認証システム

サインアップ時に自動的にウォレットの正統性を証明するシステムの実装ドキュメント

## アーキテクチャ

```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │ 1. Google認証
         ▼
┌─────────────────────────┐
│  Next.auth + Firebase   │
└────────┬────────────────┘
         │ 2. 認証成功
         ▼
┌─────────────────────────┐
│  Passkey作成            │
│  (Safe4337Pack初期化)   │
└────────┬────────────────┘
         │ 3. ウォレット作成完了
         ▼
┌─────────────────────────┐
│  API: /api/attest/sign  │ ← バックエンドでADMIN署名
│  (ADMIN秘密鍵で署名)    │
└────────┬────────────────┘
         │ 4. Claim + 署名を取得
         ▼
┌─────────────────────────┐
│  submitAttestationViaSafe│ ← Safe4337Pack経由で送信
│  (UserOperation実行)     │
└────────┬────────────────┘
         │ 5. Attestation送信
         ▼
┌─────────────────────────┐
│  LegitRegistry712       │ ← コントラクトに記録
│  Contract               │
└─────────────────────────┘
```

## 実装ファイル

### 1. バックエンド (API Routes)

#### `/api/attest/sign/route.ts`
- **役割**: ADMIN署名を作成
- **入力**: `walletAddress` (ユーザーのSafeウォレットアドレス)
- **出力**: `{ claim, signature }`
- **認証**: Next.auth sessionで保護
- **秘密鍵**: `ADMIN_PRIVATE_KEY` 環境変数 (Anvilデフォルト: `0xac0974...`)

```typescript
// リクエスト例
POST /api/attest/sign
Body: { "walletAddress": "0x..." }

// レスポンス
{
  "claim": {
    "appId": "0x...",
    "userHash": "0x...",
    "wallet": "0x...",
    "nonce": "0x...",
    "issuedAt": 1234567890,
    "expiresAt": 1234567890
  },
  "signature": "0x..."
}
```

### 2. トランザクション実行

#### `/src/app/libs/submitAttestation.ts`
- **役割**: Safe4337Pack経由でAttestationを送信
- **主要関数**:
  - `encodeSubmitAttestationData(claim, signature)`: トランザクションデータをエンコード
  - `submitAttestationViaSafe(safe4337Pack, claim, signature)`: UserOperationとして実行

```typescript
// 使い方
import { submitAttestationViaSafe } from '@/app/libs/submitAttestation'

const userOpHash = await submitAttestationViaSafe(
  safe4337Pack,  // Safe4337Packインスタンス
  claim,          // Claim構造体
  signature       // ADMIN署名
)
```

### 3. フロントエンド統合

#### `/src/app/hooks/useAttestationOnSignup.tsx`
- **役割**: Attestation送信のロジックとステータス管理
- **主要機能**:
  - バックエンドからADMIN署名を取得
  - Safe4337Pack経由でAttestation送信
  - ステータス管理 (`idle`, `fetching-signature`, `submitting`, `success`, `error`)

```typescript
// 使い方
const { submitAttestation, status, isLoading, isSuccess, isError } = useAttestationOnSignup()

// Attestation送信
await submitAttestation(safe4337Pack, walletAddress)
```

#### `/src/app/components/AttestationFlow.tsx`
- **役割**: 自動Attestation送信のUIコンポーネント
- **トリガー**:
  - ユーザーがログイン済み
  - Safeウォレットが初期化済み
  - まだAttestation送信していない

```tsx
// 使い方（ページに追加）
import { AttestationFlow } from '@/app/components/AttestationFlow'

<AttestationFlow />
```

### 4. Passkey Hooks の更新

#### `/src/app/hooks/safepasskeyFooks.tsx`
- **変更点**: `safe4337Pack` を返すように修正
- **理由**: Attestation送信で `Safe4337Pack` インスタンスが必要

```typescript
const {
  safe4337Pack,  // ← 追加
  safeAddress,
  isDeployed,
  // ...
} = useSafePasskeyHooks()
```

## 使い方

### 1. 環境変数の設定

`.env.local` に以下を追加：

```bash
# ADMIN秘密鍵（本番環境では安全に管理してください）
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# User Hash用のPepper（ランダムな文字列）
USER_HASH_PEPPER=your-random-secret-pepper-string
```

### 2. ページに統合

```tsx
'use client'

import { AttestationFlow } from '@/app/components/AttestationFlow'
import { SessionProvider } from 'next-auth/react'

export default function Page() {
  return (
    <SessionProvider>
      {/* 他のコンポーネント */}

      {/* Attestation自動送信 */}
      <AttestationFlow />
    </SessionProvider>
  )
}
```

### 3. フロー

1. **ユーザーがGoogle認証でサインアップ**
   - Next.auth でセッション作成

2. **Passkeyウォレットを作成**
   - `useSafePasskeyHooks().initializeOrRestore()`
   - Safe4337Pack初期化

3. **自動的にAttestation送信**
   - `AttestationFlow` コンポーネントが検知
   - `/api/attest/sign` からADMIN署名を取得
   - Safe4337Pack経由でコントラクトに送信

4. **ウォレット認証完了**
   - `LegitRegistry712.isLegit(wallet)` → `true`

## セキュリティ

### ADMIN秘密鍵の管理

**⚠️ 重要**: ADMIN秘密鍵は絶対にクライアント側に公開しないでください。

- ✅ サーバー側APIルートで使用
- ✅ 環境変数で管理
- ✅ 本番環境では安全なシークレット管理サービスを使用
- ❌ クライアント側コードに含めない
- ❌ Gitにコミットしない

### User Hashの生成

```typescript
// ユーザー識別子 + Pepper → Keccak256
const userHashInput = `${userId}:${USER_HASH_PEPPER}`
const userHash = keccak256(toHex(userHashInput))
```

これにより、個人情報（メールアドレス）を直接コントラクトに保存せず、プライバシーを保護します。

## テスト

### ローカルテスト

1. Anvilを起動:
```bash
cd contract
./start-anvil.sh
```

2. コントラクトをデプロイ:
```bash
cd contract
forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

3. フロントエンドを起動:
```bash
npm run dev
```

4. Google認証でログイン → 自動的にAttestation送信

### 確認方法

```typescript
import { createLegitRegistry } from '@/app/libs/legitRegistry'

const registry = createLegitRegistry(
  LEGIT_REGISTRY_ADDRESS,
  RPC_URL
)

// ウォレットの正統性を確認
const status = await registry.checkLegitStatus(walletAddress)
console.log('Is Legit:', status.isLegit)  // true
console.log('Last UID:', status.lastUID)
```

## トラブルシューティング

### 署名取得エラー

```
Error: Unauthorized - Please sign in first
```

→ Next.auth のセッションが有効か確認

### トランザクション送信エラー

```
Error: Safe not initialized
```

→ `safe4337Pack` が初期化されているか確認

### nonce already used

```
Error: NONCE_USED
```

→ 同じnonceで2回送信している。新しいClaimを作成してください。

## Contract Address

- **Sepolia (local anvil)**: `0x16C632BafA9b3ce39bdCDdB00c3D486741685425`
- **ADMIN**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

## 参考

- [LegitRegistry712 Library](./src/app/libs/README.md)
- [Contract README](./contract/README.md)
