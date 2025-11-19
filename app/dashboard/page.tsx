// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { logout } from '../(auth)/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, TrendingUp, Users, Settings } from 'lucide-react'
import { AddSongForm } from '@/components/songs/add-song-form'
import { SongList } from '@/components/songs/song-list'
import { TriggerFetch } from '@/components/admin/trigger-fetch'

interface DashboardStats {
  totalSongs: number
  todayGrowth: number
  totalLikes: number
}

export default function DashboardPage() {
  const { user, isAdmin, isLoading } = useAuthStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    todayGrowth: 0,
    totalLikes: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router, mounted])

  // 获取统计数据
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/songs/my-songs')
        if (response.ok) {
          const data = await response.json()
          const songs = data.songs || []
          
          const totalLikes = songs.reduce((sum: number, song: any) => 
            sum + (song.latest_stats?.likes || 0), 0
          )

          setStats({
            totalSongs: songs.length,
            todayGrowth: 0, // TODO: 实现今日增长计算
            totalLikes,
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user, refreshTrigger])

  const handleLogout = async () => {
    await logout()
  }

  const handleSongAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  if (!mounted) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">正在跳转到登录页...</p>
        </div>
      </div>
    )
  }

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
              {loadingStats ? (
                <div className="text-2xl font-bold">--</div>
              ) : (
                <div className="text-2xl font-bold">{stats.totalSongs}</div>
              )}
              <p className="text-xs text-muted-foreground">
                {stats.totalSongs === 0 ? '暂无追踪的歌曲' : '正在追踪中'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                总点赞数
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="text-2xl font-bold">--</div>
              ) : (
                <div className="text-2xl font-bold">
                  {stats.totalLikes.toLocaleString()}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                所有歌曲累计点赞
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

        {/* 歌曲添加表单 */}
        <div className="mb-8">
          <AddSongForm onSuccess={handleSongAdded} />
        </div>

        {/* 歌曲列表 */}
        <SongList refreshTrigger={refreshTrigger} />

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
        {isAdmin && (
  <div className="mt-6">
    <TriggerFetch />
  </div>
)}

      </main>
    </div>
  )
}