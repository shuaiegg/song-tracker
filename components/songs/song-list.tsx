// src/components/songs/song-list.tsx
'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth-store'
import { SongCard } from './song-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Music, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Song {
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

interface MySongsResponse {
  songs: Song[]
  total: number
}

// 🚀 提取 API 调用函数
async function fetchMySongs(): Promise<MySongsResponse> {
  const response = await fetch('/api/songs/my-songs?limit=10')
  if (!response.ok) {
    throw new Error('获取歌曲列表失败')
  }
  return response.json()
}

export function SongList() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // 🚀 使用 React Query 自动管理加载、错误和缓存状态
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-songs', 'list', user?.id],
    queryFn: fetchMySongs,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const songs = data?.songs || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {error instanceof Error ? error.message : '未知错误'}
            </p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (songs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">还没有追踪的歌曲</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            添加您的第一首歌曲开始数据追踪
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>我的歌曲 ({songs.length})</CardTitle>
          <CardDescription>
            正在追踪 {songs.length} 首歌曲的数据变化
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onViewDetails={() => {
              console.log('View details:', song.id)
              window.location.href = `/dashboard/songs/${song.id}`
            }}
            onDeleted={() => {
              // 刷新歌曲列表缓存
              queryClient.invalidateQueries({ queryKey: ['my-songs'] })
            }}
          />
        ))}
      </div>
    </div>
  )
}