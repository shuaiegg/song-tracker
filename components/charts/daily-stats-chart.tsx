// src/components/charts/daily-stats-chart.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCount } from '@/lib/parse-douyin-data'

interface DailyStatsChartProps {
  data: Array<{
    date: string
    likes: number
    favorites: number
    comments: number
    shares: number
    change_rate: number
  }>
}

export function DailyStatsChart({ data }: DailyStatsChartProps) {
  // 转换数据格式
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    }),
    点赞增量: item.likes,
    // 收藏增量: item.favorites,
    评论增量: item.comments,
    分享增量: item.shares,
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>每日增量</CardTitle>
          <CardDescription>每日数据增长统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            暂无每日增量数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>每日增量</CardTitle>
        <CardDescription>每日数据增长统计（最近30天）</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCount(value)}
            />
            <Tooltip 
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend />
            <Bar dataKey="点赞增量" fill="#ef4444" />
            {/* <Bar dataKey="收藏增量" fill="#3b82f6" /> */}
            <Bar dataKey="评论增量" fill="#22c55e" />
            <Bar dataKey="分享增量" fill="#a855f7" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}