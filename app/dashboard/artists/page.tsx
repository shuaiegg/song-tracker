'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAuthStore } from '@/store/auth-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'

interface Artist {
  artist: string
  songCount: number
  totalLikes: number
  weekAgoTotalLikes: number | null
}

type SortKey = 'totalLikes' | 'songCount' | 'weekChange'
type SortOrder = 'asc' | 'desc'

export default function ArtistsPage() {
  const { user, isLoading: authLoading, isInitialized } = useAuthStore()
  const router = useRouter()
  const parentRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalLikes')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [user, authLoading, router])

  const { data, isLoading } = useQuery({
    queryKey: ['artists', user?.id],
    queryFn: async () => {
      const res = await fetch('/api/artists')
      if (!res.ok) throw new Error('获取失败')
      const json = await res.json()
      return json.artists as Artist[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const filtered = useMemo(() => {
    const list = data || []
    const q = search.trim().toLowerCase()
    const filtered = q ? list.filter(a => a.artist.toLowerCase().includes(q)) : list

    return [...filtered].sort((a, b) => {
      let valA: number
      let valB: number

      if (sortKey === 'weekChange') {
        const pctA = (a.weekAgoTotalLikes != null && a.weekAgoTotalLikes > 0)
          ? (a.totalLikes - a.weekAgoTotalLikes) / a.weekAgoTotalLikes
          : null
        const pctB = (b.weekAgoTotalLikes != null && b.weekAgoTotalLikes > 0)
          ? (b.totalLikes - b.weekAgoTotalLikes) / b.weekAgoTotalLikes
          : null
        if (pctA === null && pctB === null) return 0
        if (pctA === null) return 1
        if (pctB === null) return -1
        valA = pctA
        valB = pctB
      } else {
        valA = sortKey === 'totalLikes' ? a.totalLikes : a.songCount
        valB = sortKey === 'totalLikes' ? b.totalLikes : b.songCount
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB
    })
  }, [data, search, sortKey, sortOrder])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(o => o === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />
    return sortOrder === 'desc'
      ? <ArrowDown className="h-3 w-3" />
      : <ArrowUp className="h-3 w-3" />
  }

  if ((authLoading && !isInitialized) || !user) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">歌手列表</h1>
        <p className="text-muted-foreground mt-2">查看所有歌手的歌曲数与点赞数据</p>
      </div>

      {/* 搜索 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索歌手..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            共 {filtered.length} 位歌手{search && `（搜索"${search}"）`}
          </div>

          <div className="border rounded-lg overflow-hidden">
            {/* 表头 */}
            <div className="bg-muted border-b sticky top-0 z-10">
              <div className="flex items-center px-4 py-3 gap-4 text-sm font-medium">
                <div className="w-[40px] text-muted-foreground">#</div>
                <div className="flex-1">歌手</div>
                <button
                  onClick={() => handleSort('songCount')}
                  className="w-[100px] flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  歌曲数 <SortIcon k="songCount" />
                </button>
                <button
                  onClick={() => handleSort('totalLikes')}
                  className="w-[130px] flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  总点赞 <SortIcon k="totalLikes" />
                </button>
                <button
                  onClick={() => handleSort('weekChange')}
                  className="w-[130px] flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  周变化 <SortIcon k="weekChange" />
                </button>
              </div>
            </div>

            {/* 虚拟滚动 */}
            <div ref={parentRef} className="overflow-auto" style={{ height: '600px' }}>
              <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map(virtualRow => {
                  const artist = filtered[virtualRow.index]
                  const diff = (artist.weekAgoTotalLikes != null && artist.weekAgoTotalLikes > 0)
                    ? artist.totalLikes - artist.weekAgoTotalLikes
                    : null
                  const pct = (diff !== null && artist.weekAgoTotalLikes! > 0)
                    ? (diff / artist.weekAgoTotalLikes!) * 100
                    : null
                  const weekColor = pct == null
                    ? 'text-muted-foreground'
                    : pct > 0 ? 'text-green-500' : pct < 0 ? 'text-red-500' : 'text-muted-foreground'

                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="absolute top-0 left-0 w-full border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      style={{ transform: `translateY(${virtualRow.start}px)` }}
                      onClick={() => router.push(`/dashboard/songs-list?artist=${encodeURIComponent(artist.artist)}`)}
                    >
                      <div className="flex items-center px-4 py-3 gap-4 text-sm">
                        <div className="w-[40px] text-muted-foreground">
                          {virtualRow.index + 1}
                        </div>
                        <div className="flex-1 font-medium truncate">{artist.artist}</div>
                        <div className="w-[100px] text-muted-foreground">
                          {artist.songCount} 首
                        </div>
                        <div className="w-[130px] font-medium">
                          {formatCount(artist.totalLikes)}
                        </div>
                        <div className={`w-[130px] text-xs ${weekColor}`}>
                          {pct == null ? '--' : (
                            <>
                              {diff! >= 0 ? '+' : ''}{formatCount(diff!)}
                              {' '}({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
