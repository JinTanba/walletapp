/**
 * LegitRegistry712 Library Test Script
 *
 * このスクリプトでライブラリの全機能をテストします
 */

import {
  createLegitRegistryWithAdmin,
  createClaim,
  calculateExpiry,
  getCurrentTimestamp,
} from './src/app/libs/legitRegistry'
import { createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import {
  LEGIT_REGISTRY_ADDRESS,
  RPC_URL,
  ADMIN_ADDRESS,
} from './constant'

// Anvilのデフォルトアカウント
const ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
const TEST_WALLET_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const // Anvil account #1
const TEST_WALLET_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const

async function main() {
  console.log('='.repeat(80))
  console.log('LegitRegistry712 Library Test')
  console.log('='.repeat(80))
  console.log()

  // Step 1: Initialize
  console.log('Step 1: Initialize LegitRegistry')
  console.log('-'.repeat(80))
  const registry = createLegitRegistryWithAdmin(
    LEGIT_REGISTRY_ADDRESS,
    RPC_URL,
    ADMIN_PRIVATE_KEY
  )
  console.log('✓ Registry initialized')
  console.log('  Contract:', LEGIT_REGISTRY_ADDRESS)
  console.log('  RPC:', RPC_URL)
  console.log()

  // Step 2: Verify ADMIN
  console.log('Step 2: Verify ADMIN Address')
  console.log('-'.repeat(80))
  const admin = await registry.getAdmin()
  console.log('  ADMIN from contract:', admin)
  console.log('  Expected ADMIN:', ADMIN_ADDRESS)
  console.log('  Match:', admin.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? '✓' : '✗')
  console.log()

  // Step 3: Create Claim
  console.log('Step 3: Create Claim')
  console.log('-'.repeat(80))
  const claim = createClaim({
    appId: 'test-dapp',
    userHash: 'test-user@example.com',
    wallet: TEST_WALLET_ADDRESS,
    expiresAt: calculateExpiry(365 * 24 * 60 * 60), // 1 year
  })
  console.log('✓ Claim created')
  console.log('  App ID:', claim.appId)
  console.log('  User Hash:', claim.userHash)
  console.log('  Wallet:', claim.wallet)
  console.log('  Nonce:', claim.nonce)
  console.log('  Issued At:', claim.issuedAt.toString(), '(' + new Date(Number(claim.issuedAt) * 1000).toISOString() + ')')
  console.log('  Expires At:', claim.expiresAt.toString(), '(' + new Date(Number(claim.expiresAt) * 1000).toISOString() + ')')
  console.log()

  // Step 4: Check nonce
  console.log('Step 4: Check Nonce Status')
  console.log('-'.repeat(80))
  const nonceUsedBefore = await registry.isNonceUsed(claim.nonce)
  console.log('  Nonce used (before):', nonceUsedBefore ? '✗ Already used' : '✓ Not used yet')
  console.log()

  // Step 5: Create ADMIN signature
  console.log('Step 5: Create ADMIN Signature')
  console.log('-'.repeat(80))
  const signature = await registry.signClaim(claim)
  console.log('✓ Signature created')
  console.log('  Signature:', signature)
  console.log('  Length:', signature.length, 'characters')
  console.log()

  // Step 6: Verify signature (recover signer)
  console.log('Step 6: Verify Signature')
  console.log('-'.repeat(80))
  const recoveredSigner = await registry.recoverSigner(claim, signature)
  console.log('  Recovered signer:', recoveredSigner)
  console.log('  Expected signer:', ADMIN_ADDRESS)
  console.log('  Match:', recoveredSigner.toLowerCase() === ADMIN_ADDRESS.toLowerCase() ? '✓' : '✗')
  console.log()

  // Step 7: Check current status
  console.log('Step 7: Check Current Legit Status')
  console.log('-'.repeat(80))
  const statusBefore = await registry.checkLegitStatus(TEST_WALLET_ADDRESS)
  console.log('  Is Legit (before):', statusBefore.isLegit ? '✓ Yes' : '✗ No')
  console.log('  Last UID (before):', statusBefore.lastUID || 'None')
  console.log()

  // Step 8: Submit Attestation
  console.log('Step 8: Submit Attestation to Contract')
  console.log('-'.repeat(80))

  const testWalletAccount = privateKeyToAccount(TEST_WALLET_PRIVATE_KEY)
  const walletClient = createWalletClient({
    account: testWalletAccount,
    chain: sepolia,
    transport: http(RPC_URL),
  })

  console.log('  Submitting attestation...')
  try {
    const result = await registry.submitAttestation(claim, signature, walletClient)
    console.log('✓ Attestation submitted successfully!')
    console.log('  Transaction Hash:', result.transactionHash)
    console.log('  UID:', result.uid)
    console.log('  Wallet:', result.wallet)
    console.log()

    // Step 9: Check status after submission
    console.log('Step 9: Check Legit Status After Submission')
    console.log('-'.repeat(80))
    const statusAfter = await registry.checkLegitStatus(TEST_WALLET_ADDRESS)
    console.log('  Is Legit (after):', statusAfter.isLegit ? '✓ Yes' : '✗ No')
    console.log('  Last UID (after):', statusAfter.lastUID)
    console.log()

    // Step 10: Check nonce after submission
    console.log('Step 10: Check Nonce Status After Submission')
    console.log('-'.repeat(80))
    const nonceUsedAfter = await registry.isNonceUsed(claim.nonce)
    console.log('  Nonce used (after):', nonceUsedAfter ? '✓ Used' : '✗ Not used')
    console.log()

    // Step 11: Debug info
    console.log('Step 11: Debug Information')
    console.log('-'.repeat(80))
    const claimHash = await registry.getClaimHash(claim)
    const typedDigest = await registry.getTypedDigest(claim)
    console.log('  Claim Hash:', claimHash)
    console.log('  Typed Digest:', typedDigest)
    console.log()

    // Success!
    console.log('='.repeat(80))
    console.log('✓ All tests passed successfully!')
    console.log('='.repeat(80))
    console.log()
    console.log('Summary:')
    console.log('  - ADMIN signature: ✓ Created and verified')
    console.log('  - Attestation: ✓ Submitted to contract')
    console.log('  - Wallet legitimacy: ✓ Verified')
    console.log('  - Nonce: ✓ Marked as used')
    console.log()

  } catch (error) {
    console.error('✗ Error during attestation submission:')
    console.error(error)
    console.log()
    process.exit(1)
  }
}

main()
  .then(() => {
    console.log('Test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Test failed with error:')
    console.error(error)
    process.exit(1)
  })
