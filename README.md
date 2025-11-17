# Passkey Blockchain Wallet

**Passkey技術とSafeスマートコントラクトを活用した次世代Web3ウォレット**

このプロジェクトは、デバイスの生体認証（Passkey）を使用してブロックチェーンウォレットを管理する革新的なアプリケーションです。秘密鍵の保管が不要で、Google認証による簡単なオンボーディングを実現しています。

## 主要機能

- 🔐 **Passkey認証**: デバイスの生体認証を使用した安全な認証
- 🏦 **Safe統合**: Gnosis Safe（現Safe）スマートコントラクトウォレット
- ⛽ **ガスレストランザクション**: Pimlico Paymasterによるスポンサー付きトランザクション
- 🌐 **Web2 Auth**: Google OAuth による簡単なユーザーオンボーディング
- ✅ **オンチェーン証明**: EIP-712署名によるウォレット正当性証明
- 💾 **デュアルストレージ**: LocalStorageとFirebaseによるクロスデバイス同期

## 技術スタック

### フロントエンド
- **Next.js 15.5.4** (App Router + Turbopack)
- **React 19.1.0**
- **TypeScript 5**
- **Material-UI** + **Tailwind CSS 4.0**

### Web3
- **Safe Protocol Kit v4.1.0** - Safe ウォレット管理
- **Safe Relay Kit v3.1.0** - ERC-4337 Account Abstraction
- **Viem v2.37.9** - Ethereum インタラクション
- **Pimlico** - Bundler & Paymaster サービス

### 認証 & データベース
- **NextAuth.js** - OAuth 認証
- **Firebase Authentication** - セッション管理
- **Firebase Firestore** - クラウドストレージ
- **LocalStorage** - ローカルバックアップ

---

## アーキテクチャ

このプロジェクトは**モジュラーアーキテクチャ**を採用しており、認証・データベース・ビジネスロジックが明確に分離されています。

### ディレクトリ構造

```
src/
├── modules/                      # 独立したモジュール群
│   ├── auth/                     # 認証モジュール
│   │   ├── client/               # クライアント側認証
│   │   │   ├── useAuth.tsx       # 統一認証フック
│   │   │   └── firebase-auth.ts  # Firebase Auth操作
│   │   ├── server/               # サーバー側認証
│   │   │   ├── auth-service.ts   # 認証ビジネスロジック
│   │   │   └── firebase-admin-auth.ts
│   │   ├── types.ts              # 認証型定義
│   │   └── index.ts
│   │
│   └── database/                 # データベースモジュール
│       ├── client/               # クライアント側DB
│       │   ├── repositories/     # リポジトリパターン
│       │   │   ├── WalletRepository.ts
│       │   │   └── LocalStorageRepository.ts
│       │   ├── hooks/
│       │   │   └── useWalletStorage.tsx
│       │   └── firebase-client.ts
│       ├── server/               # サーバー側DB
│       │   ├── repositories/
│       │   │   └── UserRepository.ts
│       │   └── firebase-admin-db.ts
│       ├── types.ts              # DB型定義
│       └── index.ts
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/[...nextauth]/   # NextAuth.js
│   │   └── attest/               # 証明API
│   │       ├── sign/             # ADMIN署名生成
│   │       └── submit/           # 証明送信
│   ├── components/               # Reactコンポーネント
│   ├── hooks/                    # カスタムフック
│   │   └── safepasskeyFooks.tsx  # Wallet/Passkey管理
│   ├── libs/                     # ユーティリティ
│   │   ├── legitRegistry.ts      # EIP-712証明ライブラリ
│   │   ├── executeTx.ts          # トランザクション実行
│   │   └── submitAttestation.ts
│   └── page.tsx                  # メインページ
│
└── contract/                     # Solidityスマートコントラクト
    └── src/
        └── LegitRegistry712.sol  # 証明レジストリ
```

---

## コアモジュール詳細

### 1. 認証モジュール (`modules/auth/`)

**目的**: NextAuth.jsとFirebase Authenticationを統合し、一貫した認証APIを提供

#### `useAuth()` フック - 統一認証インターフェース

```typescript
import { useAuth } from '@/modules/auth/client/useAuth'

function MyComponent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  // user.id - ユーザーID (NextAuth + Firebase統合)
  // user.email - メールアドレス
  // user.firebaseUser - Firebase Userオブジェクト
}
```

**認証フロー:**

```
1. ユーザー → Google OAuth (NextAuth)
2. NextAuth → JWT Session生成
3. authService.generateFirebaseToken() → Firebaseカスタムトークン
4. クライアント → signInWithFirebase() → Firebase認証完了
5. Firestoreアクセス可能
```

### 2. データベースモジュール (`modules/database/`)

**目的**: データアクセス層を抽象化し、リポジトリパターンで管理

#### `useWalletStorage()` - デュアルストレージフック

```typescript
import { useWalletStorage } from '@/modules/database/client/hooks/useWalletStorage'

function MyComponent() {
  const storage = useWalletStorage(googleUserId)

  // 保存（LocalStorage + Firebase同時）
  await storage.saveWallet(walletData)

  // 読み込み（LocalStorage優先、Firebase fallback）
  const wallets = await storage.loadWallets()

  // デプロイ更新（両方のストレージ）
  await storage.updateDeployment(address, txHash)
}
```

**デュアルストレージ戦略:**

```
保存時:
  1. LocalStorageに即座に保存（高速、オフライン対応）
  2. Firestoreにバックアップ（クラウド同期）

読み込み時:
  1. LocalStorageから読み込み
  2. 空の場合 → Firestoreから取得
  3. Firestoreデータ → LocalStorageに同期
```

---

## ウォレット管理フロー

### 1. ウォレット作成フロー

```typescript
// 1. Passkey作成（WebAuthn）
const passkey = await createPasskey()

// 2. Safe4337Pack初期化
const pack = await Safe4337Pack.init({
  provider: RPC_URL,
  signer: passkey,          // Passkeyを署名者として使用
  bundlerUrl: BUNDLER_URL,
  paymasterOptions: {
    isSponsored: true,      // ガス代スポンサー
    paymasterUrl: PAYMASTER_URL
  }
})

// 3. Safeアドレス取得
const address = await pack.protocolKit.getAddress()

// 4. デュアルストレージに保存
await storage.saveWallet({
  safeAddress: address,
  passkey,
  googleUserID,
  createdAt: new Date().toISOString(),
  isDeployed: false
})
```

### 2. トランザクション実行フロー

```typescript
// 1. SafeOperationを作成
const safeOperation = await safe4337Pack.createTransaction({
  transactions: [{ to, value, data }]
})

// 2. Passkeyで署名
const signedOperation = await safe4337Pack.signSafeOperation(safeOperation)

// 3. Bundler経由で実行（ガスレス）
const userOpHash = await safe4337Pack.executeTransaction({
  executable: signedOperation
})

// 4. デプロイステータス更新
if (!isDeployed) {
  await storage.updateDeployment(safeAddress, userOpHash)
}
```

---

## 証明システム (Attestation)

### 概要

EIP-712署名を使用したウォレット正当性証明システム。ADMINの署名により、ウォレットが正規のものであることをオンチェーンで証明します。

### アーキテクチャ

```
クライアント              サーバー                ブロックチェーン
    │                      │                          │
    │  POST /api/attest/submit                       │
    ├─────────────────────>│                          │
    │                      │                          │
    │                      │  Claim作成 + ADMIN署名    │
    │                      │                          │
    │                      │  submitAttestation()     │
    │                      ├─────────────────────────>│
    │                      │                          │
    │  完了通知（txHash）    │                          │
    │<─────────────────────┤                          │
```

### データスキーマ

```typescript
// Firestore 'wallets' コレクション (クライアント)
interface WalletData {
  safeAddress: string
  passkey: PasskeyArgType
  googleUserID: string | null
  createdAt: string
  isDeployed: boolean
  passkeyData: {
    rawId: string
    coordinates: { x: string, y: string }
  }
  deployedAt?: string
  deploymentTxHash?: string
}

// Firestore 'users' コレクション (サーバー)
interface UserData {
  userId: string
  email: string | null
  name: string | null
  walletAddress: string
  passkeyPublicKey: string
  passkeyCredentialId: string
  createdAt: string
  attested: boolean
  attestationTxHash?: string
  attestedAt?: string
}
```

---

## セキュリティ

### 認証セキュリティ

- **多層認証**: Google OAuth → NextAuth → Firebase
- **トークン有効期限**: JWTトークンの自動更新
- **セッション管理**: サーバーサイドセッション検証

### ウォレットセキュリティ

- **Passkey保護**: デバイスのSecure Enclaveに保存
- **署名分離**: 秘密鍵はデバイス内で生成・保存、外部に出ない
- **Safe契約**: マルチシグ対応のスマートコントラクトウォレット

### データセキュリティ

- **暗号化通信**: HTTPS/WSS
- **Firebase Security Rules**: ユーザーIDベースのアクセス制御
- **プライバシー保護**: ユーザーハッシュ（Pepper付きkeccak256）

---

## 開発ガイド

### セットアップ

#### 1. 依存関係インストール

```bash
npm install
```

#### 2. 環境変数設定

`.env.local`ファイルを作成:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Pimlico
NEXT_PUBLIC_PIMLICO_API_KEY=your_pimlico_api_key

# スマートコントラクト
NEXT_PUBLIC_LEGIT_REGISTRY_ADDRESS=0x...
ADMIN_PRIVATE_KEY=0x...
USER_HASH_PEPPER=your_secure_pepper
```

#### 3. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションにアクセス

#### 4. ビルド

```bash
npm run build
npm start
```

### コントラクトデプロイ

```bash
cd contract

# ローカルノード起動
anvil

# デプロイ
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast

# Sepoliaデプロイ
forge script script/DeployLocal.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

---

## 拡張性

このアーキテクチャは以下の拡張が容易です:

### データベース切り替え

```typescript
// modules/database/client/repositories/SupabaseRepository.ts
export class SupabaseRepository implements WalletStorageInterface {
  async save(wallet: WalletData): Promise<void> {
    // Supabase実装
  }
}
```

### 認証プロバイダー追加

```typescript
// NextAuth設定に追加
providers: [
  GoogleProvider({ ... }),
  MetaMaskProvider({ ... })  // 新規追加
]
```

### キャッシュ層の追加

```typescript
export class CachedWalletRepository extends WalletRepository {
  private cache = new Map<string, WalletData>()

  async findByAddress(address: string): Promise<WalletData | null> {
    if (this.cache.has(address)) {
      return this.cache.get(address)!
    }

    const wallet = await super.findByAddress(address)
    if (wallet) this.cache.set(address, wallet)
    return wallet
  }
}
```

---

## トラブルシューティング

### Passkeyが作成できない

**原因**: HTTPSまたはlocalhostでない環境
**解決**: HTTPS環境で実行するか、`localhost`を使用

### Firebase認証エラー

**原因**: 環境変数の設定ミス
**解決**: `.env.local`を確認し、すべての`FIREBASE_*`変数が設定されているか確認

### トランザクションが失敗する

**原因**: Paymasterの残高不足、またはネットワークエラー
**解決**:
1. Pimlicoダッシュボードで残高確認
2. RPC URLの接続確認
3. ネットワーク（Sepolia）が正しいか確認

### ウォレットが復元できない

**原因**: LocalStorageまたはFirebaseのデータ不整合
**解決**:
1. ブラウザの開発者ツールでLocalStorageを確認
2. Firebase Consoleでウォレットデータを確認
3. `clearWalletData()`で初期化して再作成

---

## ライセンス

MIT License

## 参考リンク

- [Safe Protocol Kit](https://docs.safe.global/sdk/protocol-kit)
- [ERC-4337 Account Abstraction](https://eips.ethereum.org/EIPS/eip-4337)
- [WebAuthn / Passkeys](https://webauthn.guide/)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)
- [Pimlico Documentation](https://docs.pimlico.io/)
- [NextAuth.js](https://next-auth.js.org/)
- [Firebase](https://firebase.google.com/docs)
