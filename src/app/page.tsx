"use client";
import { useState, useEffect } from "react";
import { useSafePasskeyHooks } from "./hooks/safepasskeyFooks";
import { sendLogMessage } from "./libs/executeTx";
import { useSession, signOut as nextAuthSignOut } from "next-auth/react";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./libs/firebase";
import { GoogleAuthButton } from "./components/GoogleAuthButton";

export default function Home() {
  const { data: session, status } = useSession();
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  // NextAuthセッションからFirebaseトークンを使ってFirebaseにログイン
  useEffect(() => {
    if (session?.firebaseToken && !firebaseUser) {
      console.log('Signing in to Firebase with custom token...');
      signInWithCustomToken(auth, session.firebaseToken)
        .then((result) => {
          console.log('Firebase sign-in successful:', result.user.email);
          setFirebaseUser(result.user);
        })
        .catch((error) => {
          console.error('Firebase sign-in error:', error);
        });
    }
  }, [session, firebaseUser]);

  const {
    safeAddress,
    isDeployed,
    isLoading,
    deploySafe,
    executeTransaction,
    clearWalletData,
    initializeOrRestore
  } = useSafePasskeyHooks(session?.user?.id);

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

  const handleClearWallet = async () => {
    await clearWalletData();
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

  // セッションのローディング中
  if (status === 'loading' || isLoading) {
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
          <p className="text-gray-600 text-center text-sm">
            {status === 'loading' ? 'Loading authentication...' : 'Initializing wallet...'}
          </p>
        </div>
      </div>
    );
  }

  // Google認証が必要な場合
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Passkey Wallet</h3>
                <p className="text-sm text-gray-600">
                  Secure wallet using device biometrics and passkey technology for Web3.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Safe Integration</h3>
                <p className="text-sm text-gray-600">
                  Built on Safe (formerly Gnosis Safe) smart contract wallets for enhanced security.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Web2 Auth</h3>
                <p className="text-sm text-gray-600">
                  Easy onboarding with familiar authentication methods for seamless user experience.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Login UI */}
          <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-100">
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
              Sign in with your Google account to get started.
            </p>

            <div className="space-y-5">
              <GoogleAuthButton />
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
      </div>
    );
  }

  // Firebase認証済みだがウォレット未作成の場合
  if (firebaseUser && !safeAddress && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Features */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Passkey Wallet</h3>
                <p className="text-sm text-gray-600">
                  Secure wallet using device biometrics and passkey technology for Web3.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Safe Integration</h3>
                <p className="text-sm text-gray-600">
                  Built on Safe (formerly Gnosis Safe) smart contract wallets for enhanced security.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Web2 Auth</h3>
                <p className="text-sm text-gray-600">
                  Easy onboarding with familiar authentication methods for seamless user experience.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Wallet Creation UI */}
          <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-100">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
              Create Your Wallet
            </h1>
            <p className="text-center text-gray-500 text-sm mb-10">
              You're signed in as {session?.user?.email}. Now create your passkey wallet.
            </p>

            <div className="space-y-5">
              <button
                onClick={initializeOrRestore}
                disabled={isLoading}
                className="w-full bg-black text-white py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Continue with Passkey
                </div>
              </button>

              <button
                onClick={() => nextAuthSignOut()}
                className="w-full bg-white text-gray-700 py-3.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
              >
                Sign Out
              </button>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Features */}
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Passkey Wallet</h3>
              <p className="text-sm text-gray-600">
                Secure wallet using device biometrics and passkey technology for Web3.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Safe Integration</h3>
              <p className="text-sm text-gray-600">
                Built on Safe (formerly Gnosis Safe) smart contract wallets for enhanced security.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-gray-200 flex-shrink-0">
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Web2 Auth</h3>
              <p className="text-sm text-gray-600">
                Easy onboarding with familiar authentication methods for seamless user experience.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Wallet UI */}
        <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-100">
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
          {/* Initialize Wallet Button */}
          {!safeAddress ? (
            <button
              onClick={handleInitialize}
              className="w-full bg-black text-white py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
            >
              <div className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Continue with Passkey
              </div>
            </button>
          ) : (
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200">
              <h2 className="text-sm font-semibold mb-4 text-gray-900">
                Wallet Information
              </h2>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 block mb-2">Wallet Address</span>
                  <p className="text-xs font-mono bg-white text-gray-700 p-3 rounded-xl border border-gray-200 break-all">
                    {safeAddress}
                  </p>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 text-center">
                    Your wallet has been securely created and saved.
                  </p>
                </div>
              </div>
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
    </div>
  );
}
