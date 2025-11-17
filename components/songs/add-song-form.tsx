// src/components/songs/add-song-form.tsx
'use client'

import { useState } from 'react'
import { useFetchSong } from '@/hooks/use-fetch-song'
import { ParsedSongInfo } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Music, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { formatCount } from '@/lib/parse-douyin-data'

export function AddSongForm({ onSuccess }: { onSuccess?: () => void }) {
  const [trackId, setTrackId] = useState('')
  const [selectedRank, setSelectedRank] = useState<'A' | 'B' | 'C'>('C')
  const [songPreview, setSongPreview] = useState<ParsedSongInfo | null>(null)
  const [step, setStep] = useState<'input' | 'preview' | 'success'>('input')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const { fetchSong, isLoading, error } = useFetchSong()

  // 从 URL 提取 track_id
  const extractTrackId = (input: string): string => {
    // 如果是完整 URL
    if (input.includes('track_id=')) {
      const match = input.match(/track_id=([^&]+)/)
      return match ? match[1] : input
    }
    // 如果只是 ID
    return input.trim()
  }

  // 获取歌曲预览
  const handleFetchPreview = async () => {
    if (!trackId.trim()) return

    const id = extractTrackId(trackId)
    const result = await fetchSong(id)

    if (result) {
      setSongPreview(result)
      setStep('preview')
    }
  }

  // 确认添加歌曲
  const handleConfirmAdd = async () => {
    if (!songPreview) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/songs/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...songPreview,
          rank: selectedRank,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '添加失败')
      }

      console.log('Song added successfully:', data)
      setStep('success')
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess()
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : '添加失败'
      setSaveError(message)
      console.error('Error adding song:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // 重置表单
  const handleReset = () => {
    setTrackId('')
    setSongPreview(null)
    setStep('input')
    setSelectedRank('C')
    setSaveError(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          添加歌曲
        </CardTitle>
        <CardDescription>
          输入抖音歌曲 ID 或完整链接开始追踪
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="track-id">歌曲 ID 或链接</Label>
              <Input
                id="track-id"
                placeholder="例如: 7565441743598209040 或完整链接"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && trackId.trim() && !isLoading) {
                    handleFetchPreview()
                  }
                }}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                支持输入完整的抖音链接或直接输入 track_id
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <Button
              onClick={handleFetchPreview}
              disabled={!trackId.trim() || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  获取中...
                </>
              ) : (
                '获取歌曲信息'
              )}
            </Button>
          </div>
        )}

        {step === 'preview' && songPreview && (
          <div className="space-y-4">
            {/* 歌曲预览卡片 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-4">
                {songPreview.cover_url ? (
                  <img
                    src={songPreview.cover_url}
                    alt={songPreview.title}
                    className="w-20 h-20 rounded object-cover flex-shrink-0"
                    onError={(e) => {
                      // 图片加载失败时显示占位符
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`w-20 h-20 rounded bg-muted flex items-center justify-center flex-shrink-0 ${songPreview.cover_url ? 'hidden' : ''}`}>
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {songPreview.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {songPreview.artist}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {songPreview.album}
                  </p>
                </div>
              </div>

              {/* 统计数据 */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">点赞</div>
                  <div className="font-semibold">
                    {formatCount(songPreview.likes)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">收藏</div>
                  <div className="font-semibold">
                    {formatCount(songPreview.favorites)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">评论</div>
                  <div className="font-semibold">
                    {formatCount(songPreview.comments)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">分享</div>
                  <div className="font-semibold">
                    {formatCount(songPreview.shares)}
                  </div>
                </div>
              </div>
            </div>

            {/* Rank 选择 */}
            <div className="space-y-2">
              <Label htmlFor="rank">追踪频率</Label>
              <Select value={selectedRank} onValueChange={(v) => setSelectedRank(v as any)}>
                <SelectTrigger id="rank">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Rank A - 每小时（热门歌曲）</SelectItem>
                  <SelectItem value="B">Rank B - 每6小时（中热门）</SelectItem>
                  <SelectItem value="C">Rank C - 每12小时（一般）</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Rank 决定数据抓取频率，可以随时修改
              </p>
            </div>

            {saveError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>{saveError}</div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleReset} 
                className="flex-1"
                disabled={isSaving}
              >
                取消
              </Button>
              <Button 
                onClick={handleConfirmAdd} 
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    添加中...
                  </>
                ) : (
                  '确认添加'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">添加成功！</h3>
              <p className="text-sm text-muted-foreground">
                歌曲已开始追踪，系统将按照设定的频率自动抓取数据
              </p>
            </div>
            <Button onClick={handleReset} variant="outline">
              继续添加
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}