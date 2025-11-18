// src/components/songs/delete-song-dialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteSongDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  songTitle: string
  isDeleting: boolean
}

export function DeleteSongDialog({
  open,
  onOpenChange,
  onConfirm,
  songTitle,
  isDeleting,
}: DeleteSongDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认取消追踪？</AlertDialogTitle>
          <AlertDialogDescription>
            您确定要取消追踪《{songTitle}》吗？
            <br />
            <br />
            取消后将不再记录该歌曲的数据变化，但历史数据会被保留。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? '处理中...' : '确认取消追踪'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}