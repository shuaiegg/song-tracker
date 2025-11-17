// src/components/providers/auth-provider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsAdmin, setIsLoading, reset, setIsAdminLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // 检查管理员状态
    const checkAdmin = async (userId: string) => {
      setIsAdminLoading(true)
      try {
        const response = await fetch('/api/auth/is-admin')
        if (!response.ok) {
          // 如果API返回401，说明用户未认证或session过期，这不是一个服务端错误
          if (response.status === 401) {
            console.log('User is not authenticated, cannot check admin status.')
          } else {
            // 对于其他错误（如500），则记录下来
            console.error('Failed to check admin status:', response.status, response.statusText)
          }
          setIsAdmin(false)
          return
        }
        const data = await response.json()
        setIsAdmin(data.isAdmin || false)
      } catch (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsAdminLoading(false)
      }
    }

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsLoading(true)

        const currentUser = session?.user
        
        if (currentUser) {
          setUser(currentUser)
          await checkAdmin(currentUser.id)
        } else {
          reset() // 用户登出或session失效时重置整个auth状态
        }
        
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}