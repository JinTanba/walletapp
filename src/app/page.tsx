"use client";
import { useState } from "react";
import { useSafePasskeyHooks } from "./hooks/safepasskeyFooks";
import { sendLogMessage } from "./libs/executeTx";

export default function Home() {
  const {
    safeAddress,
    isDeployed,
    isLoading,
    deploySafe,
    executeTransaction,
    clearWalletData,
    initializeOrRestore
  } = useSafePasskeyHooks();

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txResult, setTxResult] = useState<string | null>(null);

  // Fixed contract address
  const LOG_CONTRACT_ADDRESS = '0x9b1B5d4c95530d747bfaad5934A8E5D448a28AF5';

  const handleDeploy = async () => {
    if (!safeAddress) return;

    setIsDeploying(true);
    try {
      const result = await deploySafe();
      setDeployResult(result);
    } catch (error) {
      console.error('Deploy failed:', error);
      setDeployResult('Deploy failed');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClearWallet = () => {
    clearWalletData();
    setDeployResult(null);
  };

  const handleInitialize = async () => {
    try {
      await initializeOrRestore();
    } catch (error) {
      console.error('Initialize failed:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message || !executeTransaction) return;

    setIsSending(true);
    try {
      // Use executeTransaction from hook
      const result = await executeTransaction(
        LOG_CONTRACT_ADDRESS,
        '0',
        // Encode the function call data
        await import('viem').then(({ encodeFunctionData }) =>
          encodeFunctionData({
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
        )
      );
      setTxResult(result);
      setMessage(""); // Clear message after sending
    } catch (error) {
      console.error('Send message failed:', error);
      setTxResult('Send failed');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm p-12 max-w-md w-full border border-gray-100">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
          <p className="text-gray-600 text-center text-sm">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-sm p-12 max-w-md w-full border border-gray-100">
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
          Welcome to Wallet
        </h1>
        <p className="text-center text-gray-500 text-sm mb-10">
          Build, earn and scale. The all-in-one powerful and customizable wallet for Web3.
        </p>

        <div className="space-y-5">
          {/* Wallet Status */}
          {safeAddress && (
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h2 className="text-sm font-semibold mb-4 text-gray-900">
                Wallet Status
              </h2>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">Address</span>
                  <p className="text-xs font-mono bg-white text-gray-700 p-3 rounded-xl border border-gray-200 break-all">
                    {safeAddress}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Status</span>
                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    isDeployed
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {isDeployed ? 'Deployed' : 'Not Deployed'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!safeAddress ? (
              <button
                onClick={handleInitialize}
                className="w-full bg-black text-white py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Initialize Wallet
                </div>
              </button>
            ) : (
              <>
                {!isDeployed && (
                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="w-full bg-black text-white py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center">
                      {isDeploying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Deploy Safe
                        </>
                      )}
                    </div>
                  </button>
                )}

                <button
                  onClick={handleClearWallet}
                  className="w-full bg-white text-gray-700 py-3.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Wallet
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Transaction Section */}
          {safeAddress && (
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h2 className="text-sm font-semibold mb-4 text-gray-900">
                Send Transaction
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Contract Address
                  </label>
                  <div className="w-full bg-white text-gray-700 p-3 rounded-xl border border-gray-200 font-mono text-xs">
                    {LOG_CONTRACT_ADDRESS}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-2">
                    Message
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    className="w-full bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:outline-none text-sm"
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !message}
                  className="w-full bg-black text-white py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center">
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Send Message
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {deployResult && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
              <h3 className="text-xs font-semibold text-blue-900 mb-3">
                Deploy Result
              </h3>
              <p className="text-xs font-mono text-blue-700 break-all bg-white p-3 rounded-xl border border-blue-100">
                {deployResult}
              </p>
            </div>
          )}

          {txResult && (
            <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
              <h3 className="text-xs font-semibold text-green-900 mb-3">
                Transaction Result
              </h3>
              <p className="text-xs font-mono text-green-700 break-all bg-white p-3 rounded-xl border border-green-100">
                {txResult}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            By connecting your wallet you agree to the{' '}
            <a href="#" className="text-gray-900 hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-gray-900 hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
