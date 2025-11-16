// src/components/providers/auth-provider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsAdmin, setIsLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // 检查管理员状态
    const checkAdmin = async (userId: string) => {
      try {
        console.log('Checking admin status for user:', userId)
        
        const response = await fetch('/api/auth/is-admin', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
        
        console.log('Admin API response status:', response.status)
        
        if (!response.ok) {
          console.error('Admin API response not OK:', response.status)
          setIsAdmin(false)
          return
        }
        
        const data = await response.json()
        console.log('Admin API response data:', data)
        
        setIsAdmin(data.isAdmin || false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      }
    }

    // 获取初始 session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        console.log('Auth init - session:', session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          // 检查管理员状态
          await checkAdmin(session.user.id)
        } else {
          setUser(null)
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setUser(null)
        setIsAdmin(false)
      } finally {
        console.log('Auth loading complete')
        setIsLoading(false)
      }
    }

    initAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (session?.user) {
          setUser(session.user)
          await checkAdmin(session.user.id)
        } else {
          setUser(null)
          setIsAdmin(false)
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setIsAdmin, setIsLoading])

  return <>{children}</>
}