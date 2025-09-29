"use client";
import Safe from '@safe-global/protocol-kit'
import { useEffect, useState } from 'react'
import { PasskeyArgType, extractPasskeyData } from '@safe-global/protocol-kit'
import { Safe4337Pack, SponsoredPaymasterOption } from '@safe-global/relay-kit'
import {
    BUNDLER_URL,
    PAYMASTER_ADDRESS,
    PAYMASTER_URL,
    RPC_URL
} from '../../../constant'
import {sepolia} from 'viem/chains'

const RP_NAME = 'Safe Smart Account'
const USER_DISPLAY_NAME = 'User display name'
const USER_NAME = 'User name'
const STORAGE_KEY = 'safe_passkey_list'

const paymasterOptions = {
    isSponsored: true,
    paymasterAddress: PAYMASTER_ADDRESS,
    paymasterUrl: PAYMASTER_URL
} as SponsoredPaymasterOption

console.log('BUNDLER_URL', BUNDLER_URL)
console.log('PAYMASTER_URL', PAYMASTER_URL)
console.log('RPC_URL', RPC_URL)
console.log('PAYMASTER_ADDRESS', PAYMASTER_ADDRESS)

type StoredWalletData = {
    passkey: PasskeyArgType
    safeAddress: string
}

export function useSafePasskeyHooks() {
    const [safe4337Pack, setSafe4337Pack] = useState<Safe4337Pack | null>(null)
    const [safeAddress, setSafeAddress] = useState<string | null>(null)
    const [isDeployed, setIsDeployed] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)

    useEffect(() => {
        initializeOrRestore()
    }, [])

    // Passkeyを作成
    const createPasskey = async (): Promise<PasskeyArgType> => {
        const passkeyCredential = await navigator.credentials.create({
            publicKey: {
                pubKeyCredParams: [
                    {
                        alg: -7,
                        type: 'public-key'
                    }
                ],
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                rp: {
                    name: RP_NAME
                },
                user: {
                    displayName: USER_DISPLAY_NAME,
                    id: crypto.getRandomValues(new Uint8Array(32)),
                    name: USER_NAME
                },
                timeout: 60_000,
                attestation: 'none'
            }
        })

        if (!passkeyCredential) {
            throw Error('Passkey creation failed: No credential was returned.')
        }

        const passkey = await extractPasskeyData(passkeyCredential)
        console.log('Created Passkey:', passkey)
        return passkey
    }

    // ローカルストレージに保存
    const storeWalletData = (passkey: PasskeyArgType, safeAddress: string) => {
        const wallets = loadWalletData()
        const newWallet: StoredWalletData = { passkey, safeAddress }
        wallets.push(newWallet)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
    }

    // ローカルストレージから読み込み
    const loadWalletData = (): StoredWalletData[] => {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    }

    // 初期化または復元
    const initializeOrRestore = async () => {
        setIsLoading(true)
        try {
            const wallets = loadWalletData()
            
            if (wallets.length > 0) {
                // 最初のウォレットを復元（複数ある場合は選択UIを追加可能）
                await restoreWallet(wallets[0])
            } else {
                // 新規作成
                await createNewWallet()
            }
        } catch (error) {
            console.error('Failed to initialize:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // 新規ウォレット作成
    const createNewWallet = async () => {
        console.log('Creating new wallet...')
        
        // Passkey作成
        const passkey = await createPasskey()
        
        // Safe4337Pack初期化
        const pack = await Safe4337Pack.init({
            provider: RPC_URL,
            signer: passkey,
            bundlerUrl: BUNDLER_URL,
            paymasterOptions,
            options: {
                owners: [],
                threshold: 1
            }
        })

        const address = await pack.protocolKit.getAddress()
        const deployed = await pack.protocolKit.isSafeDeployed()

        // 保存
        storeWalletData(passkey, address)

        setSafe4337Pack(pack)
        setSafeAddress(address)
        setIsDeployed(deployed)

        console.log('New wallet created:', address)
    }

    // 既存ウォレット復元（シンプル版）
    const restoreWallet = async (walletData: StoredWalletData) => {
        console.log('Restoring wallet...')
        
        // 保存されたPasskeyをそのまま使用
        const pack = await Safe4337Pack.init({
            provider: RPC_URL,
            signer: walletData.passkey,  // 保存されたPasskeyを直接使用
            bundlerUrl: BUNDLER_URL,
            paymasterOptions,
            options: {
                owners: [],
                threshold: 1
            }
        })

        const deployed = await pack.protocolKit.isSafeDeployed()
        
        setSafe4337Pack(pack)
        setSafeAddress(walletData.safeAddress)
        setIsDeployed(deployed)

        console.log('Wallet restored:', walletData.safeAddress)
    }

    // Safeをデプロイ
    const deploySafe = async () => {
        if (!safe4337Pack || !safeAddress) {
            throw new Error('Safe not initialized')
        }

        if (isDeployed) {
            console.log('Safe already deployed')
            return null
        }

        console.log('Deploying Safe...')
        
        const deploymentTransaction = await safe4337Pack.protocolKit.createSafeDeploymentTransaction()
        const safeOperation = await safe4337Pack.createTransaction({
            transactions: [deploymentTransaction]
        })
        const signedOperation = await safe4337Pack.signSafeOperation(safeOperation)
        const userOpHash = await safe4337Pack.executeTransaction({
            executable: signedOperation
        })

        setIsDeployed(true)
        console.log('Safe deployed:', userOpHash)
        
        return userOpHash
    }

    // トランザクション実行
    const executeTransaction = async (
        to: string,
        value: string = '0',
        data: string = '0x'
    ) => {
        if (!safe4337Pack) {
            throw new Error('Safe not initialized')
        }

        const safeOperation = await safe4337Pack.createTransaction({
            transactions: [{ to, value, data }]
        })
        const signedOperation = await safe4337Pack.signSafeOperation(safeOperation)
        const userOpHash = await safe4337Pack.executeTransaction({
            executable: signedOperation
        })

        if (!isDeployed) {
            setIsDeployed(await safe4337Pack.protocolKit.isSafeDeployed())
        }

        console.log('Transaction executed:', userOpHash)
        return userOpHash
    }

    // データクリア
    const clearWalletData = () => {
        localStorage.removeItem(STORAGE_KEY)
        setSafe4337Pack(null)
        setSafeAddress(null)
        setIsDeployed(false)
        console.log('Wallet data cleared')
    }

    return {
        safeAddress,
        isDeployed,
        isLoading,
        deploySafe,
        executeTransaction,
        clearWalletData,
        initializeOrRestore
    }
}