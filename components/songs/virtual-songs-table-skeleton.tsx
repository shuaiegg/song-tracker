// components/songs/virtual-songs-table-skeleton.tsx

import { Skeleton } from '@/components/ui/skeleton'

export function VirtualSongsTableSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 表头 */}
      <div className="bg-muted border-b">
        <div className="flex items-center px-4 py-3 gap-4 text-sm font-medium">
          <div className="w-[50px]">
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="w-[80px]">
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="w-[200px]">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="w-[150px]">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="w-[50px]">
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="w-[100px]">
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="w-[80px]" />
        </div>
      </div>

      {/* 表格内容骨架 */}
      <div style={{ height: '600px' }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="border-b">
            <div className="flex items-center px-4 py-3 gap-4">
              {/* 复选框 */}
              <div className="w-[50px]">
                <Skeleton className="h-4 w-4" />
              </div>

              {/* 封面 */}
              <div className="w-[80px]">
                <Skeleton className="w-12 h-12 rounded" />
              </div>

              {/* 歌曲信息 */}
              <div className="w-[200px] space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>

              {/* 扩展信息 */}
              <div className="flex-1">
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-18" />
                </div>
              </div>

              {/* 统计数据 */}
              <div className="w-[150px] space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-20" />
              </div>

              {/* Rank */}
              <div className="w-[50px]">
                <Skeleton className="h-5 w-6" />
              </div>

              {/* 负责人 */}
              <div className="w-[100px]">
                <Skeleton className="h-4 w-16" />
              </div>

              {/* 操作 */}
              <div className="w-[80px]">
                <Skeleton className="h-8 w-8 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
