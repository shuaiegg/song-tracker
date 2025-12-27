

'use client';

import {useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';
import { SongFilters, FilterValues } from '@/components/songs/song-filters';
import { SongsTable } from '@/components/songs/song-table';
import { BatchStatsPanel } from '@/components/songs/batch-stats-panel';
import { BatchUploadDialog } from '@/components/songs/batch-upload-dialog' // ✨ 新增导入
import { toast } from 'sonner';


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
  const { user, isLoading: authLoading } = useAuthStore()
  const router = useRouter()
  
  const [songs, setSongs] = useState<SongWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSongs, setSelectedSongs] = useState<string[]>([])
  
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
  
  // 获取歌曲列表
  const fetchSongs = async () => {
    setIsLoading(true)
    
    try {
      // 构建查询参数
      const params = new URLSearchParams()
      
      if (filters.search) params.append('search', filters.search)
    //   if (filters.rank !== 'all') params.append('rank', filters.rank)
    //   if (filters.singers.length > 0) params.append('singers', filters.singers.join(','))
      if (filters.lyricists.length > 0) params.append('lyricists', filters.lyricists.join(','))
      if (filters.composers.length > 0) params.append('composers', filters.composers.join(','))
      if (filters.producers.length > 0) params.append('producers', filters.producers.join(','))
      if (filters.genres.length > 0) params.append('genres', filters.genres.join(','))
      
      const response = await fetch(`/api/songs/advanced-list?${params.toString()}`)

      if (!response.ok) {
        throw new Error('获取失败')
      }
      
      const data = await response.json()
      setSongs(data.songs || [])
      
      // 清空选择（因为列表变了）
      setSelectedSongs([])
      
    } catch (error) {
      console.error('获取歌曲列表失败:', error)
      toast.error('获取歌曲列表失败')
    } finally {
      setIsLoading(false)
    }
  }
  
  // 初始加载
  useEffect(() => {
    if (user) {
      fetchSongs()
    }
  }, [user])
  
  // 应用筛选
  const handleApplyFilters = () => {
    fetchSongs()
  }
  
  // 获取选中的歌曲完整信息
  const selectedSongsData = songs.filter(song => selectedSongs.includes(song.id))
  
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <BatchUploadDialog onSuccess={fetchSongs} />
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            共 {songs.length} 首歌曲
            {selectedSongs.length > 0 && ` · 已选择 ${selectedSongs.length} 首`}
          </div>
          
          <SongsTable
            songs={songs}
            selectedSongs={selectedSongs}
            onSelectionChange={setSelectedSongs}
            onRefresh={fetchSongs}
          />
        </>
      )}
    </div>
  )
}