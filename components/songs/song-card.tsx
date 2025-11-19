// src/components/songs/song-card.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Music, TrendingUp, MessageSquare, Share2, Heart, MoreVertical } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DeleteSongDialog } from './delete-song-dialog'
import { UpdateRankDialog } from './update-rank-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface SongCardProps {
  song: {
    id: string
    song_id: string
    title: string
    artist: string
    album: string
    cover_url?: string
    rank: 'A' | 'B' | 'C'
    latest_stats?: {
      likes: number
      favorites: number
      comments: number
      shares: number
      fetched_at: string | null
    }
  }
  onViewDetails?: () => void
  onDeleted?: () => void
}

export function SongCard({ song, onViewDetails, onDeleted }: SongCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showRankDialog, setShowRankDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdatingRank, setIsUpdatingRank] = useState(false)
  const router = useRouter()

  const rankColors = {
    A: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    B: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    C: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  }

  const rankLabels = {
    A: '每小时',
    B: '每6小时',
    C: '每12小时',
  }

  const stats = song.latest_stats || {
    likes: 0,
    favorites: 0,
    comments: 0,
    shares: 0,
    fetched_at: null,
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch('/api/songs/untrack', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: song.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '取消追踪失败')
      }

      toast.success('取消追踪成功', {
        description: `已停止追踪《${song.title}》`,
      })

      setShowDeleteDialog(false)

      if (onDeleted) {
        onDeleted()
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '取消追踪失败'
      toast.error('操作失败', {
        description: message,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateRank = async (newRank: 'A' | 'B' | 'C') => {
    setIsUpdatingRank(true)

    try {
      const response = await fetch('/api/songs/update-rank', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_id: song.id,
          rank: newRank,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '更新失败')
      }

      toast.success('更新成功', {
        description: `《${song.title}》的追踪频率已更新为 Rank ${newRank}`,
      })

      setShowRankDialog(false)

      if (onDeleted) {
        onDeleted()
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '更新失败'
      toast.error('操作失败', {
        description: message,
      })
    } finally {
      setIsUpdatingRank(false)
    }
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* 封面图 */}
            <div className="flex-shrink-0">
              {song.cover_url ? (
                <img
                  src={song.cover_url}
                  alt={song.title}
                  className="w-20 h-20 rounded-lg object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const placeholder = e.currentTarget.nextElementSibling
                    if (placeholder) {
                      placeholder.classList.remove('hidden')
                    }
                  }}
                />
              ) : null}
              <div className={`w-20 h-20 rounded-lg bg-muted flex items-center justify-center ${song.cover_url ? 'hidden' : ''}`}>
                <Music className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>

            {/* 歌曲信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate" title={song.title}>
                    {song.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate" title={song.artist}>
                    {song.artist}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge className={rankColors[song.rank]} variant="secondary">
                    {rankLabels[song.rank]}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/dashboard/songs/${song.id}`)}>
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowRankDialog(true)}>
                        修改 Rank
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 dark:text-red-400"
                      >
                        取消追踪
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 统计数据 */}
              {/* <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-medium">
                    {formatCount(stats.likes)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium">
                    {formatCount(stats.favorites)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs font-medium">
                    {formatCount(stats.comments)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5 text-purple-500" />
                  <span className="text-xs font-medium">
                    {formatCount(stats.shares)}
                  </span>
                </div>
              </div> */}

              {/* xin统计数据 */}
<div className="space-y-2 mt-3">
  <div className="grid grid-cols-4 gap-2">
    <div className="flex items-center gap-1">
      <Heart className="h-3.5 w-3.5 text-red-500" />
      <span className="text-xs font-medium">
        {formatCount(stats.likes)}
      </span>
    </div>
    <div className="flex items-center gap-1">
      <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
      <span className="text-xs font-medium">
        {formatCount(stats.favorites)}
      </span>
    </div>
    <div className="flex items-center gap-1">
      <MessageSquare className="h-3.5 w-3.5 text-green-500" />
      <span className="text-xs font-medium">
        {formatCount(stats.comments)}
      </span>
    </div>
    <div className="flex items-center gap-1">
      <Share2 className="h-3.5 w-3.5 text-purple-500" />
      <span className="text-xs font-medium">
        {formatCount(stats.shares)}
      </span>
    </div>
  </div>
  
  {/* 最后更新时间 fetched_at */}
  {stats.fetched_at && (
    <div className="text-xs text-muted-foreground flex items-center gap-1">
      <span>最后更新:</span>
      <span>
        {new Date(stats.fetched_at).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )}
</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteSongDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        songTitle={song.title}
        isDeleting={isDeleting}
      />

      <UpdateRankDialog
        open={showRankDialog}
        onOpenChange={setShowRankDialog}
        onConfirm={handleUpdateRank}
        currentRank={song.rank}
        songTitle={song.title}
        isUpdating={isUpdatingRank}
      />
    </>
  )
}