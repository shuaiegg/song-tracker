// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, TrendingUp, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AddSongForm } from '@/components/songs/add-song-form-bk'
import { SongList } from '@/components/songs/song-list'
import { TriggerFetch } from '@/components/admin/trigger-fetch'


interface DashboardStats {
  totalSongs: number
  todayGrowth: number
  totalLikes: number
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuthStore()
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [stats, setStats] = useState<DashboardStats>({
    totalSongs: 0,
    todayGrowth: 0,
    totalLikes: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

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
            todayGrowth: 0,
            totalLikes,
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [user, refreshTrigger])

  const handleSongAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">欢迎回来！</h2>
        <p className="text-muted-foreground">开始追踪您喜爱的音乐数据</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">追踪歌曲</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? '--' : stats.totalSongs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSongs === 0 ? '暂无追踪的歌曲' : '正在追踪中'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总点赞数</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loadingStats ? '--' : stats.totalLikes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">所有歌曲累计点赞</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">数据更新</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">实时</div>
            <p className="text-xs text-muted-foreground">根据 Rank 自动更新</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <AddSongForm onSuccess={handleSongAdded} />
      </div>

      <SongList refreshTrigger={refreshTrigger} />

      {isAdmin && (
        <>
          <Card className="mt-6 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                管理员功能
              </CardTitle>
              <CardDescription>您拥有管理员权限</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push('/admin')}>
                  进入管理后台
                </Button>
                <Button variant="outline">抓取日志</Button>
              </div>
            </CardContent>
          </Card>
          <div className="mt-6">
            <TriggerFetch />
          </div>
        </>
      )}
    </main>
  )
}