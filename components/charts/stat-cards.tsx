// src/components/charts/stat-cards.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, TrendingUp, MessageSquare, Share2, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'

interface StatCardsProps {
  currentStats: {
    likes: number
    favorites: number
    comments: number
    shares: number
  }
  previousStats?: {
    likes: number
    favorites: number
    comments: number
    shares: number
  }
}

export function StatCards({ currentStats, previousStats }: StatCardsProps) {
  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null
    const change = current - previous
    const percentage = ((change / previous) * 100).toFixed(1)
    return { change, percentage }
  }

  const stats = [
    {
      title: '点赞数',
      value: currentStats.likes,
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
      change: calculateChange(currentStats.likes, previousStats?.likes),
    },
    // {
    //   title: '收藏数',
    //   value: currentStats.favorites,
    //   icon: TrendingUp,
    //   color: 'text-blue-500',
    //   bgColor: 'bg-blue-50 dark:bg-blue-950',
    //   change: calculateChange(currentStats.favorites, previousStats?.favorites),
    // },
    {
      title: '评论数',
      value: currentStats.comments,
      icon: MessageSquare,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      change: calculateChange(currentStats.comments, previousStats?.comments),
    },
    {
      title: '分享数',
      value: currentStats.shares,
      icon: Share2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      change: calculateChange(currentStats.shares, previousStats?.shares),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        const isPositive = stat.change && stat.change.change > 0

        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCount(stat.value)}
              </div>
              {stat.change && (
                <div className={`flex items-center text-xs mt-1 ${
                  isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {isPositive ? (
                    <ArrowUp className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 mr-1" />
                  )}
                  <span>{Math.abs(parseFloat(stat.change.percentage))}%</span>
                  <span className="text-muted-foreground ml-1">
                    ({isPositive ? '+' : ''}{stat.change.change.toLocaleString()})
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}