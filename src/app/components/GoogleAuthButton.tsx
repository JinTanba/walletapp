'use client'

import { Button, CircularProgress } from '@mui/material'
import { Google as GoogleIcon } from '@mui/icons-material'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

interface GoogleAuthButtonProps {
  disabled?: boolean
}

export function GoogleAuthButton({ disabled = false }: GoogleAuthButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      // NextAuth.jsのsignInを使用してGoogle OAuth認証
      await signIn('google', { callbackUrl: '/' })
    } catch (error) {
      console.error('認証エラー:', error)
      setLoading(false)
    }
  }

  return (
    <Button
      variant="contained"
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
      onClick={handleClick}
      disabled={disabled || loading}
      sx={{
        backgroundColor: '#4285f4',
        color: 'white',
        '&:hover': {
          backgroundColor: '#357ae8'
        },
        padding: '12px 24px',
        fontSize: '16px',
        textTransform: 'none',
        fontWeight: 500
      }}
    >
      {loading ? '認証中...' : 'Googleでログイン'}
    </Button>
  )
}
