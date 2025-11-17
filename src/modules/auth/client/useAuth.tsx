'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { signInWithFirebase, signOutFirebase } from './firebase-auth'
import { AuthUser } from '../types'

/**
 * 統一された認証フック
 * NextAuthとFirebase Authを統合し、一貫したAPIを提供
 */
export function useAuth() {
  const { data: session, status } = useSession()
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // NextAuthセッションをFirebaseセッションに自動変換
  useEffect(() => {
    if (status === 'loading') {
      return
    }

    const initializeFirebaseAuth = async () => {
      try {
        if (session?.firebaseToken && !firebaseUser) {
          const user = await signInWithFirebase(session.firebaseToken)
          setFirebaseUser(user)
        }
      } catch (err) {
        console.error('Failed to initialize Firebase auth:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsInitializing(false)
      }
    }

    if (session?.firebaseToken) {
      initializeFirebaseAuth()
    } else {
      setIsInitializing(false)
    }
  }, [session, firebaseUser, status])

  /**
   * ログアウト処理
   * Firebaseからサインアウト（NextAuthのsignOutは呼び出し元で実行）
   */
  const logout = useCallback(async () => {
    try {
      await signOutFirebase()
      setFirebaseUser(null)
    } catch (err) {
      console.error('Failed to sign out:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    }
  }, [])

  // 統一されたユーザーオブジェクト
  // NextAuthセッションがあれば、Firebase認証完了を待たずにユーザー情報を返す
  const authUser: AuthUser | null = session?.user
    ? {
        id: session.user.id || firebaseUser?.uid || '',
        email: firebaseUser?.email || session.user.email || null,
        name: session.user.name || firebaseUser?.displayName || null,
        image: session.user.image,
        firebaseUser: firebaseUser || null
      }
    : null

  return {
    user: authUser,
    isAuthenticated: !!authUser,
    isLoading: status === 'loading' || isInitializing,
    error,
    logout
  }
}
