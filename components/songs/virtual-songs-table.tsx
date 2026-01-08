// src/components/songs/virtual-songs-table.tsx

'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, ExternalLink, Loader2 } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'
import { Song } from '@/types'
import Link from 'next/link'

interface SongWithStats extends Song {
  latest_stats?: {
    likes: number
    favorites: number
    comments: number
    shares: number
    fetched_at: string | null
  } | null
  supervisor?: string | null
}

interface VirtualSongsTableProps {
  songs: SongWithStats[]
  selectedSongs: string[]
  onSelectionChange: (songIds: string[]) => void
  isLoadingMore?: boolean
  onLoadMore?: () => void
}

export function VirtualSongsTable({
  songs,
  selectedSongs,
  onSelectionChange,
  isLoadingMore,
  onLoadMore,
}: VirtualSongsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  // 虚拟滚动配置
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 每行预估高度（像素）
    overscan: 10, // 预渲染额外的行数
  })

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(songs.map(s => s.id))
    } else {
      onSelectionChange([])
    }
  }

  // 单选
  const handleSelectSong = (songId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedSongs, songId])
    } else {
      onSelectionChange(selectedSongs.filter(id => id !== songId))
    }
  }

  const isAllSelected = songs.length > 0 && selectedSongs.length === songs.length
  const isSomeSelected = selectedSongs.length > 0 && selectedSongs.length < songs.length

  if (songs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>没有找到符合条件的歌曲</p>
      </div>
    )
  }

  // 防止 hydration 错误：确保复选框状态在客户端渲染时一致
  const checkboxChecked = isAllSelected ? true : (isSomeSelected ? 'indeterminate' : false)

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 表头（固定） */}
      <div className="bg-muted border-b sticky top-0 z-10">
        <div className="flex items-center px-4 py-3 gap-4 text-sm font-medium">
          <div className="w-[50px]">
            <Checkbox
              checked={checkboxChecked}
              onCheckedChange={handleSelectAll}
              aria-label="全选"
            />
          </div>
          <div className="w-[80px]">封面</div>
          <div className="w-[200px]">歌曲信息</div>
          <div className="flex-1">扩展信息</div>
          <div className="w-[150px]">统计数据</div>
          <div className="w-[50px]">Rank</div>
          <div className="w-[100px]">负责人</div>
          <div className="w-[80px] text-right">操作</div>
        </div>
      </div>

      {/* 虚拟滚动容器 */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }} // 固定高度，可以调整
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* 只渲染可见的行 */}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const song = songs[virtualRow.index]
            const isSelected = selectedSongs.includes(song.id)

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={`absolute top-0 left-0 w-full border-b ${
                  isSelected ? 'bg-muted/50' : ''
                }`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="flex items-center px-4 py-3 gap-4">
                  {/* 复选框 */}
                  <div className="w-[50px]">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectSong(song.id, checked as boolean)}
                      aria-label={`选择 ${song.title}`}
                    />
                  </div>

                  {/* 封面 */}
                  <div className="w-[80px]">
                    {song.cover_url ? (
                      <img
                        src={song.cover_url}
                        alt={song.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        无
                      </div>
                    )}
                  </div>

                  {/* 歌曲信息 */}
                  <div className="w-[200px] min-w-0">
                    <Link
                      href={`/dashboard/songs/${song.id}`}
                      className="font-medium hover:underline truncate block"
                    >
                      {song.title}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>

                  {/* 扩展信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const allTags: Array<{ label: string; value: string }> = []

                        // 定义所有扩展信息字段及其中文标签
                        const extendedFields = [
                          { key: 'album', label: '专辑', isString: true },
                          { key: 'lyricists', label: '作词' },
                          { key: 'composers', label: '作曲' },
                          { key: 'arrangers', label: '编曲' },
                          { key: 'producers', label: '制作人' },
                          { key: 'genres', label: '风格' },
                          { key: 'mixing_engineers', label: '混音' },
                          { key: 'recording_engineers', label: '录音' },
                        ]

                        // 收集所有扩展信息字段的值
                        extendedFields.forEach(field => {
                          const values = (song as any)[field.key]
                          if (field.isString && values) {
                            // 字符串类型字段（如 album）
                            allTags.push({ label: field.label, value: values })
                          } else if (Array.isArray(values) && values.length > 0) {
                            // 数组类型字段
                            values.forEach(value => {
                              allTags.push({ label: field.label, value })
                            })
                          }
                        })

                        return (
                          <>
                            {allTags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {tag.label}: {tag.value}
                              </Badge>
                            ))}
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* 统计数据 */}
                  <div className="w-[150px]">
                    {song.latest_stats ? (
                      <div className="space-y-0.5 text-xs">
                        <div>赞: {formatCount(song.latest_stats.likes)}</div>
                        <div>评: {formatCount(song.latest_stats.comments)}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">未加载</div>
                    )}
                  </div>

                  {/* Rank */}
                  <div className="w-[50px]">
                    <Badge variant={song.rank === 'A' ? 'default' : 'outline'} className="text-xs">
                      {song.rank}
                    </Badge>
                  </div>

                  {/* 负责人 */}
                  <div className="w-[100px] truncate text-sm">
                    {song.supervisor || '-'}
                  </div>

                  {/* 操作 */}
                  <div className="w-[80px] text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/songs/${song.id}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            查看详情
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 加载更多（可选） */}
      {isLoadingMore && (
        <div className="text-center py-4 border-t">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}
    </div>
  )
}