// src/app/dashboard/songs/[id]/page.tsx
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Music, Loader2, RefreshCw } from 'lucide-react'
import { StatsChart } from '@/components/charts/stats-chart'
import { StatCards } from '@/components/charts/stat-cards'
import { DailyStatsChart } from '@/components/charts/daily-stats-chart'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SongDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/songs/${resolvedParams.id}`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '获取数据失败')
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取数据失败'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [resolvedParams.id])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>加载失败</CardTitle>
            <CardDescription>{error || '未知错误'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} variant="outline" className="w-full">
              返回
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { song, stats } = data
  const latestStats = stats[stats.length - 1]
  const previousStats = stats.length > 1 ? stats[stats.length - 2] : null

  const rankColors = {
    A: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    B: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    C: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  }

  const rankLabels = {
    A: '每小时更新',
    B: '每6小时更新',
    C: '每12小时更新',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* 顶部导航 */}
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">歌曲详情</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* 歌曲信息卡片 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6">
              {/* 封面 */}
              <div className="flex-shrink-0">
                {song.cover_url ? (
                  <img
                    src={song.cover_url}
                    alt={song.title}
                    className="w-32 h-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
                    <Music className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{song.title}</h2>
                    <p className="text-muted-foreground">{song.artist}</p>
                    <p className="text-sm text-muted-foreground">{song.album}</p>
                  </div>
                  <Badge className={rankColors[song.rank as keyof typeof rankColors]}>
                    Rank {song.rank}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>追踪频率: {rankLabels[song.rank as keyof typeof rankLabels]}</span>
                  <span>•</span>
                  <span>歌曲ID: {song.song_id}</span>
                  <span>•</span>
                  <span>
                    添加时间: {new Date(song.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                {latestStats && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    最后更新: {new Date(latestStats.fetched_at).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 统计卡片 */}
        {latestStats && (
          <StatCards 
            currentStats={latestStats} 
            previousStats={previousStats}
          />
        )}

        {/* 趋势图表 */}
        <StatsChart
          data={stats}
          title="数据趋势"
          description="最近30天的数据变化趋势"
        />

        {/* 新增：每日增量图表 */}
{data.dailyStats && data.dailyStats.length > 0 && (
  <DailyStatsChart data={data.dailyStats} />
)}

        {/* 数据点数量提示 */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground text-center">
              共有 {stats.length} 个数据点
              {stats.length === 0 && ' • 暂无历史数据，请等待系统抓取'}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}