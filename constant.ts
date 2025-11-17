export const STORAGE_PASSKEY_LIST_KEY = 'safe_passkey_list'
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
export const CONTRACT_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'
export const CHAIN_NAME = 'sepolia'
export const PAYMASTER_ADDRESS = '0x0000000000325602a77416A16136FDafd04b299f' // SEPOLIA
export const BUNDLER_URL = `https://api.pimlico.io/v1/${11_155_111}/rpc?add_balance_override&apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`
export const PAYMASTER_URL = `https://api.pimlico.io/v2/${11_155_111}/rpc?add_balance_override&apikey=${process.env.NEXT_PUBLIC_PIMLICO_API_KEY}`

// LegitRegistry712 コントラクトアドレス (Sepolia)
// TODO: 実際のデプロイ後にアドレスを更新してください
export const LEGIT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_LEGIT_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000' as `0x${string}`

// ADMINアドレス (署名用)
export const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`
