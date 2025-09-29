import { PasskeyArgType } from '@safe-global/protocol-kit'
import { Safe4337Pack, SponsoredPaymasterOption } from '@safe-global/relay-kit'
import { encodeFunctionData } from 'viem'
import {
  BUNDLER_URL,
  PAYMASTER_ADDRESS,
  PAYMASTER_URL,
  RPC_URL
} from '../../../constant'

const paymasterOptions = {
  isSponsored: true,
  paymasterAddress: PAYMASTER_ADDRESS,
  paymasterUrl: PAYMASTER_URL
} as SponsoredPaymasterOption

// Contract address for the log message contract
const LOG_CONTRACT_ADDRESS = '0x9b1B5d4c95530d747bfaad5934A8E5D448a28AF5'; // Replace with actual deployed contract address

export const executeTx = async (
    safe4337Pack: Safe4337Pack,
    txData: {
        to: string,
        data: string,
        value: string
    }
): Promise<string> => {
  const safeOperation = await safe4337Pack.createTransaction({
    transactions: [txData]
  })

  // 3) Sign SafeOperation
  const signedSafeOperation = await safe4337Pack.signSafeOperation(safeOperation)

  console.log('SafeOperation', signedSafeOperation)

  // 4) Execute SafeOperation
  const userOperationHash = await safe4337Pack.executeTransaction({
    executable: signedSafeOperation
  })

  return userOperationHash
}

export function encodeTxData(message: string): string {
    return encodeFunctionData({
        abi: [
            {
                "inputs": [
                    {
                        "internalType": "string",
                        "name": "_message",
                        "type": "string"
                    }
                ],
                "name": "logMessage",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ],
        functionName: 'logMessage',
        args: [message]
    })
}

export const sendLogMessage = async (
    safe4337Pack: Safe4337Pack,
    message: string,
    contractAddress: string = LOG_CONTRACT_ADDRESS
): Promise<string> => {
    const data = encodeTxData(message);

    return await executeTx(safe4337Pack, {
        to: contractAddress,
        data,
        value: '0'
    });
}




