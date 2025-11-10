'use client'

import { useState, useEffect } from 'react'
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth'
import { auth, googleProvider } from '@/app/libs/firebase'

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 認証状態の監視
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    // クリーンアップ
    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      setError(null)
      const result = await signInWithPopup(auth, googleProvider)
      console.log('Google認証成功:', result.user.email)
      return result.user
    } catch (error: any) {
      console.error('Google認証エラー:', error)
      setError(error.message)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      console.log('ログアウト成功')
    } catch (error: any) {
      console.error('ログアウトエラー:', error)
      setError(error.message)
      throw error
    }
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut
  }
}
