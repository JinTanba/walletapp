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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse animation-delay-200"></div>
            <div className="w-4 h-4 bg-pink-400 rounded-full animate-pulse animation-delay-400"></div>
          </div>
          <p className="text-white/70 text-center mt-4">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20">
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-xl shadow-lg"></div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Safe Passkey Wallet
        </h1>

        <div className="space-y-6">
          {/* Wallet Status */}
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h2 className="text-lg font-semibold mb-4 text-white flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
              Wallet Status
            </h2>

            {safeAddress ? (
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-300 block mb-2">Address:</span>
                  <p className="text-xs font-mono bg-black/20 text-gray-100 p-3 rounded-lg border border-white/10 break-all">
                    {safeAddress}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                    isDeployed
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      isDeployed ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    {isDeployed ? 'Deployed' : 'Not Deployed'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No wallet initialized</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!safeAddress ? (
              <button
                onClick={handleInitialize}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center justify-center">
                      {isDeploying ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                          Deploying...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-white/5 p-6 rounded-xl border border-white/10">
              <h2 className="text-lg font-semibold mb-4 text-white flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                Send Transaction
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Contract Address:
                  </label>
                  <div className="w-full bg-black/20 text-gray-100 p-3 rounded-lg border border-white/10 font-mono text-sm">
                    {LOG_CONTRACT_ADDRESS}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Message:
                  </label>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message..."
                    className="w-full bg-black/20 text-gray-100 p-3 rounded-lg border border-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={isSending || !message}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 px-4 rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center justify-center">
                    {isSending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
              <h3 className="text-sm font-medium text-blue-300 mb-3 flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                Deploy Result:
              </h3>
              <p className="text-xs font-mono text-blue-200 break-all bg-black/20 p-3 rounded-lg">
                {deployResult}
              </p>
            </div>
          )}

          {txResult && (
            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300 mb-3 flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                Transaction Result:
              </h3>
              <p className="text-xs font-mono text-purple-200 break-all bg-black/20 p-3 rounded-lg">
                {txResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
