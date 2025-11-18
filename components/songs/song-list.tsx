// src/components/songs/song-list.tsx
'use client'

import { useEffect, useState } from 'react'
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

interface SongListProps {
  refreshTrigger?: number
}

export function SongList({ refreshTrigger = 0 }: SongListProps) {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/songs/my-songs')
      
      if (!response.ok) {
        throw new Error('获取歌曲列表失败')
      }

      const data = await response.json()
      setSongs(data.songs || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误'
      setError(message)
      console.error('Error fetching songs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSongs()
  }, [refreshTrigger])

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
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={fetchSongs} variant="outline" size="sm">
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
              // TODO: 跳转到详情页
            }}
            onDelete={() => {
              console.log('Delete song:', song.id)
              // TODO: 实现删除功能
            }}
          />
        ))}
      </div>
    </div>
  )
}