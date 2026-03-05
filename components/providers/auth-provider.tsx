// src/components/providers/auth-provider.tsx
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth-store'
import { useQueryClient } from '@tanstack/react-query'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setIsAdmin, setIsLoading, reset, setIsAdminLoading, isInitialized, setIsInitialized } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    // 检查管理员状态（带缓存）
    const checkAdmin = async (userId: string, forceRefresh = false) => {
      // ✨ 如果已初始化且不强制刷新，跳过 API 调用
      if (isInitialized && !forceRefresh) {
        setIsAdminLoading(false)
        return
      }

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

    // 🚀 初始化：立即检查当前会话
    const initializeAuth = async () => {
      // ✨ 如果已经初始化过，只在必要时显示 loading
      if (!isInitialized) {
        setIsLoading(true)
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user

        if (currentUser) {
          setUser(currentUser)
          await checkAdmin(currentUser.id)
        } else {
          reset()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        reset()
      } finally {
        setIsLoading(false)
        setIsInitialized(true) // ✨ 标记已完成初始化
      }
    }

    // 立即执行初始化
    initializeAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsLoading(true)

        const currentUser = session?.user

        if (currentUser) {
          setUser(currentUser)
          // 用户切换时（如模拟登陆）强制重新检查 admin 状态，避免旧 isAdmin 残留
          const forceRefresh = event === 'SIGNED_IN' || event === 'USER_UPDATED'
          await checkAdmin(currentUser.id, forceRefresh)
        } else {
          reset() // 用户登出或session失效时重置整个auth状态
          queryClient.clear() // 清除所有缓存，防止不同用户看到上一个用户的数据
        }

        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [isInitialized])

  return <>{children}</>
}