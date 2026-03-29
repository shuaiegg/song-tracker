'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { WeeklyTrendChart } from '@/components/charts/weekly-trend-chart'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { WeeklyTrendItem } from '@/app/api/songs/weekly-trend/route'

async function fetchWeeklyTrend(): Promise<{ data: WeeklyTrendItem[] }> {
  const res = await fetch('/api/songs/weekly-trend')
  if (!res.ok) throw new Error('Failed to fetch weekly trend')
  return res.json()
}

export default function AnalyticsPage() {
  const { user } = useAuthStore()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['weekly-trend', user?.id],
    queryFn: fetchWeeklyTrend,
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10分钟缓存
  })

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">数据分析</h2>
        <p className="text-muted-foreground">查看歌曲点赞量的周趋势变化</p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[420px] w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="flex items-center justify-center h-64 text-destructive">
            数据加载失败：{(error as Error)?.message}
          </CardContent>
        </Card>
      ) : (
        <WeeklyTrendChart data={data?.data ?? []} />
      )}
    </main>
  )
}
