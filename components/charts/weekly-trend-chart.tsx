'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCount } from '@/lib/parse-douyin-data'
import type { WeeklyTrendItem } from '@/app/api/songs/weekly-trend/route'

interface WeeklyTrendChartProps {
  data: WeeklyTrendItem[]
}

function formatWeekLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null

  const total = payload.find((p: any) => p.dataKey === 'total_likes')
  const newLikes = payload.find((p: any) => p.dataKey === 'new_likes')
  const item: WeeklyTrendItem | undefined = payload[0]?.payload

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium mb-2">周起始：{label}</p>
      {total && (
        <p className="text-blue-600 dark:text-blue-400">
          总点赞量：{total.value.toLocaleString()}
        </p>
      )}
      {newLikes && (
        <p className="text-red-500">
          本周新增：+{newLikes.value.toLocaleString()}
        </p>
      )}
      {item?.change_pct && (
        <p className={item.change_pct.startsWith('+') ? 'text-green-600' : 'text-red-600'}>
          周环比：{item.change_pct}
        </p>
      )}
    </div>
  )
}

export function WeeklyTrendChart({ data }: WeeklyTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>周点赞趋势</CardTitle>
          <CardDescription>过去3个月每周点赞量变化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            暂无数据，请确认每日汇总任务已正常运行
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map(item => ({
    ...item,
    week: formatWeekLabel(item.week_start),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>周点赞趋势</CardTitle>
        <CardDescription>过去3个月每周总点赞量及新增量（周一为起始）</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="total"
              orientation="left"
              tickFormatter={(v) => formatCount(v)}
              tick={{ fontSize: 12 }}
              width={56}
            />
            <YAxis
              yAxisId="new"
              orientation="right"
              tickFormatter={(v) => formatCount(v)}
              tick={{ fontSize: 12 }}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="new"
              dataKey="new_likes"
              name="本周新增"
              fill="#ef4444"
              opacity={0.75}
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="total"
              type="monotone"
              dataKey="total_likes"
              name="总点赞量"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
