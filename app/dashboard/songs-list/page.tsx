

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { SongFilters, FilterValues } from '@/components/songs/song-filters';
import { BatchStatsPanel } from '@/components/songs/batch-stats-panel';
import { BatchUploadDialog } from '@/components/songs/batch-upload-dialog' // ✨ 新增导入
import { toast } from 'sonner';
import { VirtualSongsTable } from '@/components/songs/virtual-songs-table' // ✨ 改用虚拟滚动表格
import { VirtualSongsTableSkeleton } from '@/components/songs/virtual-songs-table-skeleton'

interface SongWithStats {
    id: string
    song_id: string
  title: string
  artist: string
  album: string
  cover_url?: string
  rank: 'A' | 'B' | 'C'
  created_at: string
//   singers?: string[]
  lyricists?: string[]
  composers?: string[]
  producers?: string[]
  arrangers?: string[]
  mixing_engineers?: string[]
  recording_engineers?: string[]
  album_id?: string
  genres?: string[]
  latest_stats: {
    likes: number
    favorites: number
    comments: number
    shares: number
    fetched_at: string | null
  }
  supervisor?: string | null
}

export default function SongsListPage() {
  const { user, isLoading: authLoading, isInitialized } = useAuthStore()
  const router = useRouter()

  const [selectedSongs, setSelectedSongs] = useState<string[]>([])
  const [weekChangeSortOrder, setWeekChangeSortOrder] = useState<'desc' | 'asc' | null>(null)
  
  // 筛选条件
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    artist: '',
    album: '',
    // singers: [],
    lyricists: [],
    composers: [],
    producers: [],
    genres: [],
    mixing_engineers: [],
    recording_engineers:[],
    rank: 'all',
  })
  
  // 权限检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // ✨ 使用 React Query 缓存歌曲列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['songs-list', user?.id, filters],
    queryFn: async () => {
      // 构建查询参数
      const params = new URLSearchParams()

      if (filters.search) params.append('search', filters.search)
      if (filters.artist) params.append('artist', filters.artist)
      if (filters.album) params.append('album', filters.album)
      if (filters.rank !== 'all') params.append('rank', filters.rank)

      // 数组类筛选参数
      if (filters.lyricists.length > 0) params.append('lyricists', filters.lyricists.join(','))
      if (filters.composers.length > 0) params.append('composers', filters.composers.join(','))
      if (filters.producers.length > 0) params.append('producers', filters.producers.join(','))
      if (filters.genres.length > 0) params.append('genres', filters.genres.join(','))
      if (filters.mixing_engineers.length > 0) params.append('mixing_engineers', filters.mixing_engineers.join(','))
      if (filters.recording_engineers.length > 0) params.append('recording_engineers', filters.recording_engineers.join(','))

      const response = await fetch(`/api/songs/advanced-list?${params.toString()}`)

      if (!response.ok) {
        throw new Error('获取失败')
      }

      const result = await response.json()
      return result.songs || []
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 分钟
    gcTime: 10 * 60 * 1000, // 10 分钟
  })

  const rawSongs = data || []

  const songs = useMemo(() => {
    if (!weekChangeSortOrder) return rawSongs
    return [...rawSongs].sort((a: any, b: any) => {
      const pctA = (a.week_ago_likes != null && a.week_ago_likes > 0)
        ? (a.latest_stats?.likes - a.week_ago_likes) / a.week_ago_likes
        : null
      const pctB = (b.week_ago_likes != null && b.week_ago_likes > 0)
        ? (b.latest_stats?.likes - b.week_ago_likes) / b.week_ago_likes
        : null
      // 无数据的排最后
      if (pctA === null && pctB === null) return 0
      if (pctA === null) return 1
      if (pctB === null) return -1
      return weekChangeSortOrder === 'desc' ? pctB - pctA : pctA - pctB
    })
  }, [rawSongs, weekChangeSortOrder])

  // 应用筛选后清空选择
  const handleApplyFilters = () => {
    setSelectedSongs([])
    refetch()
  }

  // 获取选中的歌曲完整信息
  const selectedSongsData = songs.filter((song: { id: string; }) => selectedSongs.includes(song.id))

  // ✨ 优化：只在首次初始化时显示骨架屏，刷新时直接显示上次的内容
  if ((authLoading && !isInitialized) || !user) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        {/* 页面标题骨架 */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-9 w-32 bg-muted animate-pulse rounded" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* 筛选器骨架 */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 w-20 bg-muted animate-pulse rounded" />
            <div className="h-10 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>

        {/* 表格骨架 */}
        <VirtualSongsTableSkeleton />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-3xl font-bold">歌曲列表</h1>
        <p className="text-muted-foreground mt-2">
          搜索、筛选和管理你追踪的所有歌曲
        </p>
        </div>
        {/* ✨ 添加批量上传按钮 */}
        <BatchUploadDialog onSuccess={() => refetch()} />
      </div>

      {/* 筛选器 */}
      <SongFilters
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
      />

      {/* 批量统计面板 */}
      {selectedSongs.length > 0 && (
        <BatchStatsPanel selectedSongs={selectedSongsData} />
      )}

      {/* 歌曲表格 */}
      {isLoading ? (
        <VirtualSongsTableSkeleton />
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            共 {songs.length} 首歌曲
            {selectedSongs.length > 0 && ` · 已选择 ${selectedSongs.length} 首`}
          </div>

          
          <VirtualSongsTable
            songs={songs}
            selectedSongs={selectedSongs}
            onSelectionChange={setSelectedSongs}
            weekChangeSortOrder={weekChangeSortOrder}
            onWeekChangeSortOrderChange={setWeekChangeSortOrder}
            />


          {/* <SongsTable
            songs={songs}
            selectedSongs={selectedSongs}
            onSelectionChange={setSelectedSongs}
            onRefresh={fetchSongs}
          /> */}

          
        </>
      )}
    </div>
  )
}