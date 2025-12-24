// src/components/songs/batch-stats-panel.tsx

'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'
import { Song } from '@/types'

interface SongWithStats extends Song {
  latest_stats: {
    likes: number
    favorites: number
    comments: number
    shares: number
    fetched_at: string | null
  }
}

interface BatchStatsPanelProps {
  selectedSongs: SongWithStats[]
}

export function BatchStatsPanel({ selectedSongs }: BatchStatsPanelProps) {
  // 计算总计数据
  const totalStats = useMemo(() => {
    if (selectedSongs.length === 0) {
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        avgLikes: 0,
      }
    }
    
    const likes = selectedSongs.reduce((sum, song) => sum + song.latest_stats.likes, 0)
    const comments = selectedSongs.reduce((sum, song) => sum + song.latest_stats.comments, 0)
    const shares = selectedSongs.reduce((sum, song) => sum + song.latest_stats.shares, 0)
    
    return {
      likes,
      comments,
      shares,
      avgLikes: Math.round(likes / selectedSongs.length),
    }
  }, [selectedSongs])
  
  if (selectedSongs.length === 0) {
    return null
  }
  
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">
          已选择 {selectedSongs.length} 首歌曲的统计数据
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 总点赞数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>总点赞数</span>
            </div>
            <div className="text-2xl font-bold">{formatCount(totalStats.likes)}</div>
            <div className="text-xs text-muted-foreground">
              平均: {formatCount(totalStats.avgLikes)}
            </div>
          </div>
          
          {/* 总评论数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>总评论数</span>
            </div>
            <div className="text-2xl font-bold">{formatCount(totalStats.comments)}</div>
            <div className="text-xs text-muted-foreground">
              平均: {formatCount(Math.round(totalStats.comments / selectedSongs.length))}
            </div>
          </div>
          
          {/* 总分享数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Share2 className="h-4 w-4" />
              <span>总分享数</span>
            </div>
            <div className="text-2xl font-bold">{formatCount(totalStats.shares)}</div>
            <div className="text-xs text-muted-foreground">
              平均: {formatCount(Math.round(totalStats.shares / selectedSongs.length))}
            </div>
          </div>
          
          {/* 总互动数 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>总互动数</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCount(totalStats.likes + totalStats.comments + totalStats.shares)}
            </div>
            <div className="text-xs text-muted-foreground">
              点赞 + 评论 + 分享
            </div>
          </div>
        </div>
        
        {/* 歌曲列表预览 */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground mb-2">已选择的歌曲：</p>
          <div className="flex flex-wrap gap-2">
            {selectedSongs.slice(0, 5).map((song) => (
              <div
                key={song.id}
                className="px-2 py-1 bg-muted rounded text-xs"
              >
                {song.title}
              </div>
            ))}
            {selectedSongs.length > 5 && (
              <div className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                +{selectedSongs.length - 5} 首
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}