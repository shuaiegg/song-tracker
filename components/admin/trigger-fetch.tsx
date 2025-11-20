// src/components/admin/trigger-fetch.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface FetchResult {
  rank: string
  status: 'success' | 'error' | null
  message?: string
  data?: any
  timestamp: string
}

export function TriggerFetch() {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<FetchResult[]>([])
  const [currentAlert, setCurrentAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const triggerFetch = async (rank: 'A' | 'B' | 'C') => {
    setIsLoading(prev => ({ ...prev, [rank]: true }))
    setCurrentAlert(null)

    try {
      console.log(`Triggering fetch for Rank ${rank}...`)

      const response = await fetch(`/api/admin/trigger-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rank }),
      })

      const data = await response.json()

      console.log('API Response:', data)

      if (!response.ok) {
        throw new Error(data.error || '触发失败')
      }

      const result: FetchResult = {
        rank,
        status: 'success',
        message: `成功: ${data.data?.results?.success || 0} 首歌曲, 失败: ${data.data?.results?.failed || 0} 首`,
        data: data.data,
        timestamp: new Date().toISOString(),
      }

      setResults(prev => [result, ...prev])

      setCurrentAlert({
        type: 'success',
        message: `Rank ${rank} 抓取完成！成功 ${data.data?.results?.success || 0} 首，失败 ${data.data?.results?.failed || 0} 首`,
      })

      // 3秒后清除提示
      setTimeout(() => setCurrentAlert(null), 5000)

    } catch (error) {
      console.error('Fetch error:', error)
      const message = error instanceof Error ? error.message : '触发失败'
      
      const result: FetchResult = {
        rank,
        status: 'error',
        message,
        timestamp: new Date().toISOString(),
      }

      setResults(prev => [result, ...prev])

      setCurrentAlert({
        type: 'error',
        message: `Rank ${rank} 抓取失败: ${message}`,
      })

      // 5秒后清除提示
      setTimeout(() => setCurrentAlert(null), 5000)

    } finally {
      setIsLoading(prev => ({ ...prev, [rank]: false }))
    }
  }

  const triggerDailyRollup = async () => {
  setIsLoading(prev => ({ ...prev, 'daily': true }))
  setCurrentAlert(null)

  try {
    console.log('Triggering daily rollup...')

    const response = await fetch('/api/admin/trigger-daily-rollup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    console.log('Daily rollup response:', data)

    if (!response.ok) {
      throw new Error(data.error || '触发失败')
    }

    const result: FetchResult = {
      rank: 'Daily',
      status: 'success',
      message: `成功: ${data.data?.results?.success || 0} 首歌曲, 失败: ${data.data?.results?.failed || 0} 首, 跳过: ${data.data?.results?.skipped || 0} 首`,
      data: data.data,
      timestamp: new Date().toISOString(),
    }

    setResults(prev => [result, ...prev])

    setCurrentAlert({
      type: 'success',
      message: `每日汇总完成！成功 ${data.data?.results?.success || 0} 首，失败 ${data.data?.results?.failed || 0} 首，跳过 ${data.data?.results?.skipped || 0} 首`,
    })

    setTimeout(() => setCurrentAlert(null), 5000)

  } catch (error) {
    console.error('Daily rollup error:', error)
    const message = error instanceof Error ? error.message : '触发失败'
    
    const result: FetchResult = {
      rank: 'Daily',
      status: 'error',
      message,
      timestamp: new Date().toISOString(),
    }

    setResults(prev => [result, ...prev])

    setCurrentAlert({
      type: 'error',
      message: `每日汇总失败: ${message}`,
    })

    setTimeout(() => setCurrentAlert(null), 5000)

  } finally {
    setIsLoading(prev => ({ ...prev, 'daily': false }))
  }
}



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          手动触发数据抓取
        </CardTitle>
        <CardDescription>
          立即触发指定 Rank 的数据抓取任务（测试用）
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 操作按钮 */}
        <div className="flex gap-4">
          <Button
            onClick={() => triggerFetch('A')}
            disabled={isLoading.A}
            className="flex-1"
          >
            {isLoading.A && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            抓取 Rank A
          </Button>
          <Button
            onClick={() => triggerFetch('B')}
            disabled={isLoading.B}
            variant="secondary"
            className="flex-1"
          >
            {isLoading.B && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            抓取 Rank B
          </Button>
          <Button
            onClick={() => triggerFetch('C')}
            disabled={isLoading.C}
            variant="secondary"
            className="flex-1"
          >
            {isLoading.C && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            抓取 Rank C
          </Button>

          
        </div>

         {/* 新增：每日汇总按钮 */}
  <div className="border-t pt-4">
    <p className="text-sm text-muted-foreground mb-3">
      每日汇总：计算每首歌曲的每日增量数据
    </p>
    <Button
      onClick={triggerDailyRollup}
      disabled={isLoading.daily}
      variant="outline"
      className="w-full"
    >
      {isLoading.daily && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      执行每日汇总
    </Button>
  </div>



        {/* 当前操作提示 */}
        {currentAlert && (
          <Alert variant={currentAlert.type === 'success' ? 'default' : 'destructive'}>
            {currentAlert.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {currentAlert.type === 'success' ? '抓取完成' : '抓取失败'}
            </AlertTitle>
            <AlertDescription>{currentAlert.message}</AlertDescription>
          </Alert>
        )}

        {/* 显示历史结果 */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">执行历史</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResults([])}
              >
                清空
              </Button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${
                    result.status === 'success'
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                  }`}
                >
                  {result.status === 'success' ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">Rank {result.rank}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(result.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    <div className="text-xs">{result.message}</div>
                    {result.data?.results && (
                      <div className="text-xs mt-2 opacity-75 space-y-1">
                        <div>总计: {result.data.results.total} 首歌曲</div>
                        <div className="flex gap-4">
                          <span className="text-green-600 dark:text-green-400">
                            ✓ 成功: {result.data.results.success}
                          </span>
                          <span className="text-red-600 dark:text-red-400">
                            ✗ 失败: {result.data.results.failed}
                          </span>
                        </div>
                        {result.data.results.errors && result.data.results.errors.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-red-600 dark:text-red-400">
                              查看错误详情
                            </summary>
                            <ul className="mt-1 ml-4 list-disc space-y-1">
                              {result.data.results.errors.map((error: string, i: number) => (
                                <li key={i} className="text-xs">{error}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}