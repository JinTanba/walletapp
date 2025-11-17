"use client";
import Safe from '@safe-global/protocol-kit'
import { useEffect, useState, useCallback, useRef } from 'react'
import { PasskeyArgType, extractPasskeyData } from '@safe-global/protocol-kit'
import { Safe4337Pack, SponsoredPaymasterOption } from '@safe-global/relay-kit'
import {
    BUNDLER_URL,
    PAYMASTER_ADDRESS,
    PAYMASTER_URL,
    RPC_URL
} from '../../../constant'
import {sepolia} from 'viem/chains'
import { useWalletStorage } from '@/modules/database/client/hooks/useWalletStorage'
import { WalletData } from '@/modules/database/types'

const RP_NAME = 'Safe Smart Account'
const USER_DISPLAY_NAME = 'User display name'
const USER_NAME = 'User name'

const paymasterOptions = {
    isSponsored: true,
    paymasterAddress: PAYMASTER_ADDRESS,
    paymasterUrl: PAYMASTER_URL
} as SponsoredPaymasterOption

console.log('BUNDLER_URL', BUNDLER_URL)
console.log('PAYMASTER_URL', PAYMASTER_URL)
console.log('RPC_URL', RPC_URL)
console.log('PAYMASTER_ADDRESS', PAYMASTER_ADDRESS)

export function useSafePasskeyHooks(googleUserID?: string | null) {
    const [safe4337Pack, setSafe4337Pack] = useState<Safe4337Pack | null>(null)
    const [safeAddress, setSafeAddress] = useState<string | null>(null)
    const [isDeployed, setIsDeployed] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const initializingRef = useRef<boolean>(false)
    const initializedUserRef = useRef<string | null>(null)

    // 新しいストレージフックを使用
    const storage = useWalletStorage(googleUserID || null)

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
                attestation: 'none',
                authenticatorSelection: {
                    // クラウドバックアップ対応(同期可能)のパスキーを優先
                    residentKey: 'preferred',  // デバイスに保存されるパスキーを優先
                    requireResidentKey: false, // 非対応デバイスも許可
                    userVerification: 'preferred' // 生体認証を推奨
                }
            }
        })

        if (!passkeyCredential) {
            throw Error('Passkey creation failed: No credential was returned.')
        }

        const passkey = await extractPasskeyData(passkeyCredential)
        console.log('Created Passkey:', passkey)
        return passkey
    }

    // ウォレットデータを保存（新しいストレージモジュールを使用）
    const storeWalletData = async (passkey: PasskeyArgType, safeAddress: string) => {
        const walletData: WalletData = {
            safeAddress,
            passkey,
            googleUserID: googleUserID || null,
            createdAt: new Date().toISOString(),
            isDeployed: false,
            passkeyData: {
                rawId: passkey.rawId,
                coordinates: passkey.coordinates
            }
        }

        await storage.saveWallet(walletData)
        console.log('Wallet data saved:', safeAddress, 'for user:', googleUserID)
    }

    // マウント時に既存ウォレットを自動復元（初期化は手動）
    useEffect(() => {
        const autoRestore = async () => {
            // すでに初期化済み、または初期化中の場合はスキップ
            if (initializingRef.current || safe4337Pack || safeAddress || !googleUserID) {
                return
            }

            // このユーザーで既に初期化済みの場合はスキップ
            if (initializedUserRef.current === googleUserID) {
                return
            }

            initializingRef.current = true
            setIsLoading(true)

            try {
                // ストレージから既存ウォレットを読み込み
                const wallets = await storage.loadWallets()

                if (wallets.length > 0) {
                    // 既存ウォレットがあれば自動復元
                    await restoreWallet(wallets[0])
                    initializedUserRef.current = googleUserID
                }
                // 既存ウォレットがない場合は何もしない（手動で作成が必要）
            } catch (error) {
                console.error('Failed to restore wallet:', error)
                initializingRef.current = false
            } finally {
                setIsLoading(false)
            }
        }

        autoRestore()
    }, [googleUserID, safe4337Pack, safeAddress, storage])

    // 新規ウォレット作成（手動実行のみ）
    const createWallet = useCallback(async () => {
        if (initializingRef.current || safe4337Pack || safeAddress) {
            throw new Error('Wallet already exists or is being created')
        }

        initializingRef.current = true
        setIsLoading(true)

        try {
            await createNewWallet()
            if (googleUserID) {
                initializedUserRef.current = googleUserID
            }
        } catch (error) {
            console.error('Failed to create wallet:', error)
            initializingRef.current = false
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [safe4337Pack, safeAddress, googleUserID])

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

        // 保存（Firebase DBとローカルストレージ）
        await storeWalletData(passkey, address)

        setSafe4337Pack(pack)
        setSafeAddress(address)
        setIsDeployed(deployed)

        console.log('New wallet created:', address)
    }

    // 既存ウォレット復元
    const restoreWallet = async (walletData: WalletData) => {
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

    // Safeをデプロイ（新しいストレージモジュールを使用）
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

        // デプロイステータスを新しいストレージモジュールで更新
        try {
            await storage.updateDeployment(safeAddress, userOpHash)
            console.log('Deploy status updated')
        } catch (error) {
            console.error('Failed to update deploy status:', error)
        }

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

    // データクリア（新しいストレージモジュールを使用）
    const clearWalletData = useCallback(async () => {
        if (safeAddress) {
            try {
                await storage.deleteWallet(safeAddress)
                console.log('Wallet data deleted:', safeAddress)
            } catch (error) {
                console.error('Failed to delete wallet:', error)
            }
        }

        setSafe4337Pack(null)
        setSafeAddress(null)
        setIsDeployed(false)
        initializingRef.current = false
        initializedUserRef.current = null
        console.log('Wallet data cleared')
    }, [safeAddress, storage])

    return {
        safe4337Pack,
        safeAddress,
        isDeployed,
        isLoading,
        createWallet,        // 新規作成（手動）
        deploySafe,
        executeTransaction,
        clearWalletData
    }
}