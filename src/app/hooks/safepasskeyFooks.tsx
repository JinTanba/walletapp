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
import { db } from '../libs/firebase'
import { doc, setDoc, getDoc, deleteDoc, collection, query, getDocs } from 'firebase/firestore'

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
    googleUserID?: string
}

export function useSafePasskeyHooks(googleUserID?: string) {
    const [safe4337Pack, setSafe4337Pack] = useState<Safe4337Pack | null>(null)
    const [safeAddress, setSafeAddress] = useState<string | null>(null)
    const [isDeployed, setIsDeployed] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const initializingRef = useRef<boolean>(false)

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

    // Firebase DBとローカルストレージに保存
    const storeWalletData = async (passkey: PasskeyArgType, safeAddress: string) => {
        // ローカルストレージに保存（バックアップとして）
        const wallets = loadWalletData()
        const newWallet: StoredWalletData = { passkey, safeAddress, googleUserID }
        wallets.push(newWallet)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))

        // Firebase DBに保存
        try {
            await setDoc(doc(db, 'wallets', safeAddress), {
                safeAddress,
                passkey,
                googleUserID: googleUserID || null,
                createdAt: new Date().toISOString(),
                isDeployed: false,
                // Passkeyの主要な情報も保存（復元に必要）
                passkeyData: {
                    rawId: passkey.rawId,
                    coordinates: passkey.coordinates
                }
            })
            console.log('Wallet data saved to Firebase:', safeAddress, 'for user:', googleUserID)
        } catch (error) {
            console.error('Failed to save wallet to Firebase:', error)
            // Firebaseへの保存に失敗してもローカルストレージには保存されているので続行
        }
    }

    // ローカルストレージから読み込み
    const loadWalletData = (): StoredWalletData[] => {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    }

    // Firebase DBから読み込み（GoogleユーザーIDでフィルタリング）
    const loadWalletDataFromFirebase = async (): Promise<StoredWalletData[]> => {
        try {
            const walletsRef = collection(db, 'wallets')
            const querySnapshot = await getDocs(walletsRef)
            const wallets: StoredWalletData[] = []

            querySnapshot.forEach((doc) => {
                const data = doc.data()
                // GoogleユーザーIDが一致するウォレットのみ取得
                if (data.passkey && data.safeAddress && (!googleUserID || data.googleUserID === googleUserID)) {
                    wallets.push({
                        passkey: data.passkey,
                        safeAddress: data.safeAddress,
                        googleUserID: data.googleUserID
                    })
                }
            })

            return wallets
        } catch (error) {
            console.error('Failed to load wallets from Firebase:', error)
            return []
        }
    }

    // 初期化または復元
    const initializeOrRestore = useCallback(async () => {
        // すでに初期化中または完了している場合はスキップ
        if (initializingRef.current || safe4337Pack || safeAddress) {
            console.log('Already initialized or initializing, skipping...')
            return
        }

        initializingRef.current = true
        setIsLoading(true)
        try {
            // まずローカルストレージから読み込み
            let wallets = loadWalletData()

            // ローカルストレージにデータがない場合、Firebase DBから読み込み
            if (wallets.length === 0) {
                wallets = await loadWalletDataFromFirebase()
                // Firebase DBから読み込んだデータはローカルストレージにも保存
                if (wallets.length > 0) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
                }
            }

            if (wallets.length > 0) {
                // 最初のウォレットを復元（複数ある場合は選択UIを追加可能）
                await restoreWallet(wallets[0])
            } else {
                // 新規作成
                await createNewWallet()
            }
        } catch (error) {
            console.error('Failed to initialize:', error)
            initializingRef.current = false
        } finally {
            setIsLoading(false)
        }
    }, [safe4337Pack, safeAddress, googleUserID])

    // 初回マウント時に初期化
    useEffect(() => {
        initializeOrRestore()
    }, [initializeOrRestore])

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

        // Firebase DBのデプロイステータスを更新
        try {
            const walletDoc = doc(db, 'wallets', safeAddress)
            const docSnapshot = await getDoc(walletDoc)
            if (docSnapshot.exists()) {
                await setDoc(walletDoc, {
                    ...docSnapshot.data(),
                    isDeployed: true,
                    deployedAt: new Date().toISOString(),
                    deploymentTxHash: userOpHash
                }, { merge: true })
                console.log('Deploy status updated in Firebase')
            }
        } catch (error) {
            console.error('Failed to update deploy status in Firebase:', error)
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

    // データクリア
    const clearWalletData = async () => {
        // Firebase DBからデータを削除
        if (safeAddress) {
            try {
                await deleteDoc(doc(db, 'wallets', safeAddress))
                console.log('Wallet data deleted from Firebase:', safeAddress)
            } catch (error) {
                console.error('Failed to delete wallet from Firebase:', error)
            }
        }

        // ローカルストレージからもクリア
        localStorage.removeItem(STORAGE_KEY)
        setSafe4337Pack(null)
        setSafeAddress(null)
        setIsDeployed(false)
        initializingRef.current = false
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