// src/components/charts/stats-chart.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCount } from '@/lib/parse-douyin-data'

interface StatsChartProps {
  data: Array<{
    fetched_at: string
    likes: number
    favorites: number
    comments: number
    shares: number
  }>
  title: string
  description?: string
}

export function StatsChart({ data, title, description }: StatsChartProps) {
  // 转换数据格式
  const chartData = data.map(item => ({
    time: new Date(item.fetched_at).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    点赞: item.likes,
    收藏: item.favorites,
    评论: item.comments,
    分享: item.shares,
  }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            暂无数据
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCount(value)}
            />
            <Tooltip 
              formatter={(value: number) => value.toLocaleString()}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="点赞" 
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            {/* <Line 
              type="monotone" 
              dataKey="收藏" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ r: 3 }}
            /> */}
            <Line 
              type="monotone" 
              dataKey="评论" 
              stroke="#22c55e" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="分享" 
              stroke="#a855f7" 
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}