// src/components/songs/songs-table.tsx

'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, ExternalLink } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'
import { Song } from '@/types'
import Link from 'next/link'

interface SongWithStats extends Song {
  latest_stats: {
    likes: number
    favorites: number
    comments: number
    shares: number
    fetched_at: string | null
  }
  supervisor?: string | null
}

interface SongsTableProps {
  songs: SongWithStats[]
  selectedSongs: string[]
  onSelectionChange: (songIds: string[]) => void
  onRefresh?: () => void
}

export function SongsTable({
  songs,
  selectedSongs,
  onSelectionChange,
  onRefresh,
}: SongsTableProps) {
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
  
  // 是否全选
  const isAllSelected = songs.length > 0 && selectedSongs.length === songs.length
  const isSomeSelected = selectedSongs.length > 0 && selectedSongs.length < songs.length
  
  if (songs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>没有找到符合条件的歌曲</p>
      </div>
    )
  }
  
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="全选"
                className={isSomeSelected ? 'data-[state=checked]:bg-muted' : ''}
              />
            </TableHead>
            <TableHead className="w-[80px]">封面</TableHead>
            <TableHead>歌曲信息</TableHead>
            <TableHead>扩展信息</TableHead>
            <TableHead>统计数据</TableHead>
            <TableHead className="w-[80px]">Rank</TableHead>
            <TableHead className="w-[100px]">负责人</TableHead>
            <TableHead className="w-[80px] text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {songs.map((song) => {
            const isSelected = selectedSongs.includes(song.id)
            
            return (
              <TableRow
                key={song.id}
                className={isSelected ? 'bg-muted/50' : ''}
              >
                {/* 复选框 */}
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectSong(song.id, checked as boolean)}
                    aria-label={`选择 ${song.title}`}
                  />
                </TableCell>
                
                {/* 封面 */}
                <TableCell>
                  {song.cover_url ? (
                    <img
                      src={song.cover_url}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      无封面
                    </div>
                  )}
                </TableCell>
                
                {/* 歌曲信息 */}
                <TableCell>
                  <div className="space-y-1">
                    <Link
                      href={`/dashboard/songs/${song.id}`}
                      className="font-medium hover:underline"
                    >
                      {song.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{song.artist}</p>
                    {song.album && (
                      <p className="text-xs text-muted-foreground">{song.album}</p>
                    )}
                  </div>
                </TableCell>
                
                {/* 扩展信息 */}
                <TableCell>
                  <div className="space-y-2 max-w-xs">
                    {/* 歌手 */}
                    {song.singers && song.singers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">歌手:</span>
                        {song.singers.slice(0, 2).map((singer, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {singer}
                          </Badge>
                        ))}
                        {song.singers.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{song.singers.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* 制作人 */}
                    {song.producers && song.producers.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">制作:</span>
                        {song.producers.slice(0, 2).map((producer, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {producer}
                          </Badge>
                        ))}
                        {song.producers.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{song.producers.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* 音乐风格 */}
                    {song.genres && song.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground">风格:</span>
                        {song.genres.slice(0, 3).map((genre, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {genre}
                          </Badge>
                        ))}
                        {song.genres.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{song.genres.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                {/* 统计数据 */}
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">点赞:</span>
                      <span className="font-medium">
                        {formatCount(song.latest_stats.likes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">评论:</span>
                      <span className="font-medium">
                        {formatCount(song.latest_stats.comments)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">分享:</span>
                      <span className="font-medium">
                        {formatCount(song.latest_stats.shares)}
                      </span>
                    </div>
                  </div>
                </TableCell>
                
                {/* Rank */}
                <TableCell>
                  <Badge
                    variant={
                      song.rank === 'A'
                        ? 'default'
                        : song.rank === 'B'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {song.rank}
                  </Badge>
                </TableCell>
                
                {/* 负责人 */}
                <TableCell>
                  {song.supervisor ? (
                    <span className="text-sm">{song.supervisor}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                
                {/* 操作 */}
                <TableCell className="text-right">
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
                      <DropdownMenuItem
                        onClick={() => {
                          window.open(
                            `https://www.douyin.com/search/${encodeURIComponent(song.title)}`,
                            '_blank'
                          )
                        }}
                      >
                        在抖音中查看
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}