// src/components/songs/add-song-form.tsx

'use client'

import { useState } from 'react'
import { useFetchSong } from '@/hooks/use-fetch-song'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Music, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { SongExtendedFields } from './song-extended-fields'  // ✨ 新增导入
import { SongFormData, RankType } from '@/types'

interface AddSongFormProps {
  onSuccess?: () => void
}

export function AddSongForm({ onSuccess }: AddSongFormProps) {
  const [trackId, setTrackId] = useState('')
  const [selectedRank, setSelectedRank] = useState<RankType>('C')
  const [songPreview, setSongPreview] = useState<any>(null)
  const [step, setStep] = useState<'input' | 'preview' | 'success'>('input')
  const [isAdding, setIsAdding] = useState(false)
  
  // ✨ 新增：扩展字段的状态
  const [extendedFields, setExtendedFields] = useState<Partial<SongFormData>>({
    // singers: [],
    lyricists: [],
    composers: [],
    producers: [],
    arrangers: [],
    mixing_engineers: [],
    recording_engineers: [],
    // album_id: '',
    genres: [],
  })
  const [supervisor, setSupervisor] = useState('')

  const { fetchSong, isLoading, error } = useFetchSong()

  // 步骤 1: 获取歌曲预览
  const handleFetchPreview = async () => {
    if (!trackId.trim()) {
      toast.error('请输入歌曲 ID')
      return
    }

    const result = await fetchSong(trackId.trim())
    if (result) {
      setSongPreview(result)
      setStep('preview')
    }
  }

  // ✨ 处理扩展字段变化
  const handleExtendedFieldChange = (field: string, value: string | string[]) => {
    setExtendedFields(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // 步骤 2: 确认添加
  const handleConfirmAdd = async () => {
    setIsAdding(true)
    
    try {
      const response = await fetch('/api/songs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 基本信息
          song_id: songPreview.song_id,
          title: songPreview.title,
          artist: songPreview.artist,
          album_id: songPreview.album_id,
          album: songPreview.album,
          cover_url: songPreview.cover_url,
          rank: selectedRank,
          // 统计数据
          likes: songPreview.likes,
          favorites: songPreview.favorites || 0,
          comments: songPreview.comments,
          shares: songPreview.shares,
          // ✨ 扩展字段
          ...extendedFields,
          // ✨ 负责人（用户级别）
          supervisor: supervisor.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '添加失败')
      }

      toast.success('添加成功！')
      setStep('success')
      onSuccess?.()

    } catch (error: any) {
      console.error('添加失败:', error)
      toast.error(error.message || '添加失败，请重试')
    } finally {
      setIsAdding(false)
    }
  }

  // 重置表单
  const handleReset = () => {
    setTrackId('')
    setSelectedRank('C')
    setSongPreview(null)
    setExtendedFields({
    //   singers: [],
      lyricists: [],
      composers: [],
      producers: [],
      arrangers: [],
      mixing_engineers: [],
      recording_engineers: [],
    //   album_id: '',
      genres: [],
    })
    setSupervisor('')
    setStep('input')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>添加歌曲追踪</CardTitle>
        <CardDescription>
          输入抖音歌曲 ID，获取歌曲信息后添加到追踪列表
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 步骤 1: 输入歌曲 ID */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="track-id">歌曲 ID</Label>
              <div className="flex gap-2">
                <Input
                  id="track-id"
                  type="text"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  placeholder="例如: 7234567890123456789"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFetchPreview()
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  onClick={handleFetchPreview}
                  disabled={isLoading || !trackId.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      获取中
                    </>
                  ) : (
                    <>
                      <Music className="mr-2 h-4 w-4" />
                      获取信息
                    </>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* 步骤 2: 预览并填写扩展信息 */}
        {step === 'preview' && songPreview && (
          <div className="space-y-6">
            {/* 歌曲预览 */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start gap-4">
                {songPreview.cover_url && (
                  <img
                    src={songPreview.cover_url}
                    alt={songPreview.title}
                    className="w-20 h-20 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Song: {songPreview.title}</h3>
                  <p className="text-muted-foreground">Singers: {songPreview.artist}</p>
                  <p className="text-sm text-muted-foreground">Album ID: {songPreview.album_id}</p>
                  <p className="text-sm text-muted-foreground">Album: {songPreview.album}</p>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">点赞: </span>
                      <span className="font-medium">{songPreview.likes.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">评论: </span>
                      <span className="font-medium">{songPreview.comments.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">分享: </span>
                      <span className="font-medium">{songPreview.shares.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 追踪频率选择 */}
            <div className="space-y-2">
              <Label>追踪频率 (Rank)</Label>
              <RadioGroup value={selectedRank} onValueChange={(v) => setSelectedRank(v as RankType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="A" id="rank-a" />
                  <Label htmlFor="rank-a" className="font-normal cursor-pointer">
                    Rank A - 每小时抓取
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="B" id="rank-b" />
                  <Label htmlFor="rank-b" className="font-normal cursor-pointer">
                    Rank B - 每 6 小时抓取
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="C" id="rank-c" />
                  <Label htmlFor="rank-c" className="font-normal cursor-pointer">
                    Rank C - 每 12 小时抓取
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* ✨ 扩展字段 */}
            <SongExtendedFields
              formData={extendedFields}
              onChange={handleExtendedFieldChange}
              supervisor={supervisor}
              onSupervisorChange={setSupervisor}
            />

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('input')}
                disabled={isAdding}
              >
                返回
              </Button>
              <Button
                onClick={handleConfirmAdd}
                disabled={isAdding}
                className="flex-1"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    添加中
                  </>
                ) : (
                  '确认添加'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤 3: 成功 */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold">添加成功！</h3>
              <p className="text-muted-foreground mt-2">
                歌曲已添加到追踪列表，系统将自动抓取数据
              </p>
            </div>
            <Button onClick={handleReset}>
              继续添加
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}