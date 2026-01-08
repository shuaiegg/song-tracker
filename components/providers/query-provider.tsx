'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // 为每个请求创建新的 QueryClient，避免跨请求共享状态
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 数据在 5 分钟内保持新鲜
            staleTime: 5 * 60 * 1000,
            // 缓存数据 10 分钟
            gcTime: 10 * 60 * 1000,
            // 失败时重试 1 次
            retry: 1,
            // 窗口重新获得焦点时不自动刷新
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
