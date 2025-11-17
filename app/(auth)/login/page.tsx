// src/app/(auth)/login/page.tsx
'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { reset, user, setUser } = useAuthStore()
  const router = useRouter()

  // 组件挂载时重置状态
  useEffect(() => {
    reset()
  }, [reset])

  // 登录成功后跳转
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleAuthSuccess = async () => {
    const supabase = createClient()
    await supabase.auth.refreshSession()
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
    }
  }

  // 登录处理
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string

    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        await handleAuthSuccess()
      }
    })
  }

  // 注册处理
  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm-password') as string

    if (password !== confirmPassword) {
      setError('密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    // 创建新的 FormData，只包含 email 和 password
    const signupData = new FormData()
    signupData.set('email', formData.get('email') as string)
    signupData.set('password', password)

    startTransition(async () => {
      const result = await signup(signupData)
      if (result?.error) {
        setError(result.error)
      } else {
        await handleAuthSuccess()
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            歌曲数据追踪系统
          </CardTitle>
          <CardDescription className="text-center">
            登录或注册以开始追踪您的音乐数据
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" disabled={isPending}>登录</TabsTrigger>
              <TabsTrigger value="signup" disabled={isPending}>注册</TabsTrigger>
            </TabsList>

            {/* 登录表单 */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    disabled={isPending}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isPending}
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">
                    ❌ {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      登录中...
                    </span>
                  ) : (
                    '登录'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* 注册表单 */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">邮箱</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    disabled={isPending}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">密码</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="至少6位"
                    required
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认密码</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    placeholder="再次输入密码"
                    required
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded">
                    ❌ {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      注册中...
                    </span>
                  ) : (
                    '注册'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-sm text-muted-foreground">
          <p className="text-center">
            继续即表示您同意我们的服务条款和隐私政策
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}