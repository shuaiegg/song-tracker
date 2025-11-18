// src/components/songs/update-rank-dialog.tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface UpdateRankDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (newRank: 'A' | 'B' | 'C') => void
  currentRank: 'A' | 'B' | 'C'
  songTitle: string
  isUpdating: boolean
}

export function UpdateRankDialog({
  open,
  onOpenChange,
  onConfirm,
  currentRank,
  songTitle,
  isUpdating,
}: UpdateRankDialogProps) {
  const [selectedRank, setSelectedRank] = useState<'A' | 'B' | 'C'>(currentRank)

  const handleConfirm = () => {
    onConfirm(selectedRank)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改追踪频率</DialogTitle>
          <DialogDescription>
            为《{songTitle}》选择新的数据抓取频率
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={selectedRank} onValueChange={(v) => setSelectedRank(v as any)}>
            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 mb-3">
              <RadioGroupItem value="A" id="rank-a" />
              <div className="flex-1">
                <Label htmlFor="rank-a" className="font-semibold cursor-pointer">
                  Rank A - 每小时
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  适合热门歌曲，数据更新最频繁
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 mb-3">
              <RadioGroupItem value="B" id="rank-b" />
              <div className="flex-1">
                <Label htmlFor="rank-b" className="font-semibold cursor-pointer">
                  Rank B - 每6小时
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  适合中热门歌曲，平衡频率与资源
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
              <RadioGroupItem value="C" id="rank-c" />
              <div className="flex-1">
                <Label htmlFor="rank-c" className="font-semibold cursor-pointer">
                  Rank C - 每12小时
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  适合冷门歌曲或长期观察
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isUpdating || selectedRank === currentRank}>
            {isUpdating ? '更新中...' : '确认修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}