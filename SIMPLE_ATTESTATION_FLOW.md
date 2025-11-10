# シンプルなAttestation Flow

## フロー概要

```
1. ユーザーがGoogle認証でログイン (Next.auth)
   ↓
2. Passkeyウォレット作成 (Safe4337Pack)
   ↓
3. [ボタンクリック] → /api/attest/submit
   ↓
   ┌─────────────────────────────────┐
   │  バックエンド処理（並列実行）  │
   ├─────────────────────────────────┤
   │ A. Firebaseに保存               │
   │    - PassKey公開鍵              │
   │    - walletアドレス             │
   │    - user_id                    │
   │                                 │
   │ B. ADMIN署名を作成              │
   │                                 │
   │ C. ADMINウォレットから          │
   │    submitAttestationを実行      │
   │    (普通のトランザクション)     │
   └─────────────────────────────────┘
   ↓
   並列実行
   ↓
   ┌─────────────────────────────────┐
   │  フロントエンド                 │
   ├─────────────────────────────────┤
   │ D. Safe4337Pack経由で           │
   │    ログ出力txを実行             │
   └─────────────────────────────────┘
```

## 実装ファイル

### 1. バックエンドAPI

**`/api/attest/submit/route.ts`**
- Next.auth sessionで認証確認
- Firebaseに保存
- Claimを作成・ADMIN署名
- ADMINウォレットからコントラクトにトランザクション送信

### 2. フロントエンド

**`useSimpleAttestation.tsx`**
- Attestation送信とログ出力を並列実行
- ステータス管理

**`SimpleAttestationButton.tsx`**
- ボタンUI
- 状態表示（処理中、成功、エラー）

## 使い方

### ページに追加

```tsx
'use client'

import { SimpleAttestationButton } from '@/app/components/SimpleAttestationButton'
import { SessionProvider } from 'next-auth/react'

export default function Page() {
  return (
    <SessionProvider>
      {/* 他のコンポーネント */}

      {/* Attestationボタン */}
      <SimpleAttestationButton />
    </SessionProvider>
  )
}
```

### ボタンをクリックすると

1. **バックエンド処理** (並列):
   - Firebaseに保存
   - ADMIN署名作成
   - ADMINウォレットからsubmitAttestation実行

2. **フロントエンド処理** (並列):
   - Safe4337Pack経由でログ出力

## 重要ポイント

### ✅ シンプル
- ユーザーはボタンをクリックするだけ
- 複雑なロジックは全てバックエンドで処理

### ✅ セキュア
- ADMIN秘密鍵はバックエンドのみで使用
- Next.auth sessionで認証確認

### ✅ ガス代不要（Attestationのみ）
- AttestationはADMINウォレットから送信
- ユーザーはガス代を払わない
- ログ出力はSafe4337Pack（Paymaster付き）

### ✅ 並列実行
- Attestationとログ出力を同時実行
- 高速処理

## トランザクション

### Attestation (バックエンド)
- **送信元**: ADMINウォレット (`0xf39Fd...`)
- **送信先**: LegitRegistry712コントラクト
- **ガス代**: ADMINが負担
- **内容**: ユーザーのウォレットを正統として登録

### ログ出力 (フロントエンド)
- **送信元**: ユーザーのSafeウォレット
- **送信先**: LogMessageコントラクト
- **ガス代**: Paymasterが負担（スポンサー付き）
- **内容**: "Attestation for 0x..." というログ

## 環境変数

`.env.local`:
```bash
# ADMIN秘密鍵（Attestation送信用）
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# User Hash用のPepper
USER_HASH_PEPPER=your-random-secret-pepper

# LegitRegistry712コントラクトアドレス
LEGIT_REGISTRY_ADDRESS=0x16C632BafA9b3ce39bdCDdB00c3D486741685425
```

## API仕様

### POST /api/attest/submit

**Request:**
```json
{
  "walletAddress": "0x...",
  "passkeyPublicKey": "...",  // オプション
  "passkeyCredentialId": "..."  // オプション
}
```

**Response (Success - New Attestation):**
```json
{
  "success": true,
  "isNewAttestation": true,
  "transactionHash": "0x...",
  "walletAddress": "0x...",
  "message": "Attestation completed successfully"
}
```

**Response (Success - Already Attested):**
```json
{
  "success": true,
  "alreadyAttested": true,
  "message": "Wallet already attested",
  "lastUID": "0x..."
}
```

**Response (Error):**
```json
{
  "error": "Failed to submit attestation",
  "details": "Error message"
}
```

## トラブルシューティング

### Unauthorized エラー
```
Error: Unauthorized - Please sign in first
```
→ Google認証でログインしてください

### Wallet not initialized
```
Error: Wallet not initialized
```
→ Passkeyウォレットを作成してください

### Transaction failed
```
Error: Failed to submit attestation
```
→ Anvilが起動しているか確認
→ ADMIN_PRIVATE_KEYが正しく設定されているか確認
→ コントラクトアドレスが正しいか確認

## テスト

1. Anvilを起動
```bash
cd contract
./start-anvil.sh
```

2. フロントエンドを起動
```bash
npm run dev
```

3. Google認証でログイン

4. Passkeyウォレットを作成

5. "Verify Wallet"ボタンをクリック

6. 成功すると：
   - Attestation Txハッシュが表示される
   - Log Txハッシュが表示される

## まとめ

- **ユーザー体験**: ボタン1クリックで完了
- **セキュリティ**: ADMIN秘密鍵はバックエンドのみ
- **コスト**: Attestationのガス代はADMIN負担
- **速度**: 並列実行で高速処理
