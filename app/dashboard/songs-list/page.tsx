

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
import { SongFilters, FilterValues } from '@/components/songs/song-filters';
import { BatchStatsPanel } from '@/components/songs/batch-stats-panel';
import { BatchUploadDialog } from '@/components/songs/batch-upload-dialog' // ✨ 新增导入
import { toast } from 'sonner';
import { VirtualSongsTable } from '@/components/songs/virtual-songs-table' // ✨ 改用虚拟滚动表格
import { VirtualSongsTableSkeleton } from '@/components/songs/virtual-songs-table-skeleton'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

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
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [selectedSongs, setSelectedSongs] = useState<string[]>([])
  const [weekChangeSortOrder, setWeekChangeSortOrder] = useState<'desc' | 'asc' | null>(null)
  const [minLikes, setMinLikes] = useState('')
  const [maxLikes, setMaxLikes] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // 筛选条件：支持从 URL 参数预填 artist（从歌手页跳转）
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    artist: searchParams.get('artist') || '',
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
    // search/artist 在客户端 useMemo 过滤，不触发 API 请求
    queryKey: ['songs-list', user?.id,
      filters.rank, filters.album,
      filters.lyricists.join(','), filters.composers.join(','),
      filters.producers.join(','), filters.genres.join(','),
      filters.mixing_engineers.join(','), filters.recording_engineers.join(','),
    ],
    queryFn: async () => {
      const params = new URLSearchParams()

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

  // 周变化异步加载：不阻塞主列表，加载完后自动填充
  const { data: weekAgoData } = useQuery({
    queryKey: ['week-ago-likes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_week_ago_likes')
      if (error) {
        console.error('周变化查询失败:', error)
        return []
      }
      return data || []
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const weekAgoMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    weekAgoData?.forEach((row: any) => { map[row.song_id] = row.likes })
    return map
  }, [weekAgoData])

  const songs = useMemo(() => {
    // 先把 week_ago_likes 合并进每首歌（weekAgoMap 加载前为 null，加载后自动更新）
    let result = rawSongs.map((s: any) => ({
      ...s,
      week_ago_likes: weekAgoMap[s.id] ?? null,
    }))

    // 客户端文本搜索：即时响应，不触发 API
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase()
      result = result.filter((s: any) =>
        s.title?.toLowerCase().includes(q) || s.artist?.toLowerCase().includes(q)
      )
    }
    if (filters.artist.trim()) {
      const a = filters.artist.toLowerCase()
      result = result.filter((s: any) => s.artist?.toLowerCase().includes(a))
    }

    const min = minLikes !== '' ? Number(minLikes) : null
    const max = maxLikes !== '' ? Number(maxLikes) : null

    if (min !== null || max !== null) {
      result = result.filter((s: any) => {
        const likes = s.latest_stats?.likes ?? 0
        if (min !== null && likes < min) return false
        if (max !== null && likes > max) return false
        return true
      })
    }

    if (startDate || endDate) {
      result = result.filter((s: any) => {
        const date = s.relation_created_at
        if (!date) return false
        if (startDate && date < startDate) return false
        if (endDate && date > endDate + 'T23:59:59') return false
        return true
      })
    }

    if (!weekChangeSortOrder) return result
    return [...result].sort((a: any, b: any) => {
      const pctA = (a.week_ago_likes != null && a.week_ago_likes > 0)
        ? (a.latest_stats?.likes - a.week_ago_likes) / a.week_ago_likes
        : null
      const pctB = (b.week_ago_likes != null && b.week_ago_likes > 0)
        ? (b.latest_stats?.likes - b.week_ago_likes) / b.week_ago_likes
        : null
      if (pctA === null && pctB === null) return 0
      if (pctA === null) return 1
      if (pctB === null) return -1
      return weekChangeSortOrder === 'desc' ? pctB - pctA : pctA - pctB
    })
  }, [rawSongs, weekAgoMap, weekChangeSortOrder, minLikes, maxLikes, startDate, endDate, filters.search, filters.artist])

  // 应用筛选后清空选择
  const handleApplyFilters = () => {
    setSelectedSongs([])
    refetch()
  }

  // 获取选中的歌曲完整信息
  const selectedSongsData = songs.filter((song: { id: string; }) => selectedSongs.includes(song.id))

  // ✨ 优化：只在首次初始化时显示骨架屏，刷新时直接显示上次的内容
  if (!mounted || (authLoading && !isInitialized) || !user) {
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

      {/* 赞数区间过滤 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">赞数范围</span>
        <Input
          type="number"
          placeholder="最低"
          value={minLikes}
          onChange={e => setMinLikes(e.target.value)}
          className="w-32 h-8 text-sm"
          min={0}
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="number"
          placeholder="最高"
          value={maxLikes}
          onChange={e => setMaxLikes(e.target.value)}
          className="w-32 h-8 text-sm"
          min={0}
        />
        {(minLikes !== '' || maxLikes !== '') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => { setMinLikes(''); setMaxLikes('') }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 添加日期范围过滤 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">添加时间</span>
        <Input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="w-36 h-8 text-sm"
        />
        <span className="text-muted-foreground">~</span>
        <Input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="w-36 h-8 text-sm"
        />
        {(startDate !== '' || endDate !== '') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground"
            onClick={() => { setStartDate(''); setEndDate('') }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

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