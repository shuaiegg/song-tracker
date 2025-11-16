// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { logout } from '../(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, TrendingUp, Users, Settings } from 'lucide-react'

export default function DashboardPage() {
  const { user, isAdmin, isLoading } = useAuthStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('Dashboard mounted')
  }, [])

  useEffect(() => {
    console.log('Dashboard state:', { 
      mounted, 
      isLoading, 
      hasUser: !!user,
      userEmail: user?.email,
      isAdmin 
    })

    if (mounted && !isLoading && !user) {
      console.log('No user, redirecting to login...')
      router.push('/login')
    }
  }, [user, isLoading, router, mounted, isAdmin])

  const handleLogout = async () => {
    await logout()
  }

  if (!mounted) {
    console.log('Dashboard: Not mounted yet')
    return null
  }

  if (isLoading) {
    console.log('Dashboard: Loading...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
          <p className="mt-2 text-xs text-muted-foreground">
            正在验证身份...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('Dashboard: No user, showing redirect message')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">正在跳转到登录页...</p>
        </div>
      </div>
    )
  }

  console.log('Dashboard: Rendering main content')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* 顶部导航栏 */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">歌曲数据追踪系统</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {user.email}
              {isAdmin && (
                <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                  管理员
                </span>
              )}
            </div>
            <Button variant="outline" onClick={handleLogout}>
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">欢迎回来！</h2>
          <p className="text-muted-foreground">
            开始追踪您喜爱的音乐数据
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                追踪歌曲
              </CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                暂无追踪的歌曲
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                今日增长
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                添加歌曲后查看
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                数据更新
              </CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">实时</div>
              <p className="text-xs text-muted-foreground">
                根据 Rank 自动更新
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
            <CardDescription>
              添加您的第一首歌曲开始数据追踪
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Music className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">还没有追踪的歌曲</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                输入抖音歌曲 ID，我们将自动为您追踪点赞、收藏、评论等数据变化
              </p>
              <Button size="lg">
                添加歌曲
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 管理员专属 */}
        {isAdmin && (
          <Card className="mt-6 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                管理员功能
              </CardTitle>
              <CardDescription>
                您拥有管理员权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline">
                  查看所有用户
                </Button>
                <Button variant="outline">
                  查看所有歌曲
                </Button>
                <Button variant="outline">
                  抓取日志
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
