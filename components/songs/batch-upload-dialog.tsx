// src/components/songs/batch-upload-dialog.tsx

'use client'

import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  downloadCSVTemplate,
  downloadExcelTemplate,
  parseUploadFile,
  validateUploadData,
  transformUploadData,
} from '@/lib/batch-upload-template'
import { toast } from 'sonner'

interface BatchUploadDialogProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

type Step = 'upload' | 'preview' | 'processing' | 'result'

interface UploadResult {
  total: number
  success: number
  skipped: number
  failed: number
  details: {
    success: Array<{ row: number; title: string; song_id: string }>
    skipped: Array<{ row: number; title: string; reason: string }>
    failed: Array<{ row: number; song_id: string; error: string }>
  }
}

export function BatchUploadDialog({ onSuccess, trigger }: BatchUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [validationErrors, setValidationErrors] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // 重置状态
  const resetState = () => {
    setStep('upload')
    setFile(null)
    setPreviewData([])
    setValidationErrors([])
    setUploadProgress(0)
    setUploadResult(null)
    setIsProcessing(false)
  }

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // 检查文件大小（5MB）
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过 5MB')
      return
    }

    // 检查文件格式
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      toast.error('只支持 .csv 和 .xlsx 文件')
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)

    try {
      // 解析文件
      const rows = await parseUploadFile(selectedFile)
      
      if (rows.length === 0) {
        toast.error('文件中没有有效数据')
        setFile(null)
        return
      }

      // 验证数据
      const errors = validateUploadData(rows)
      setValidationErrors(errors)

      // 转换数据
      const transformed = transformUploadData(rows)
      setPreviewData(transformed)

      // 进入预览步骤
      setStep('preview')
      
    } catch (error: any) {
      console.error('解析文件失败:', error)
      toast.error(error.message || '文件解析失败')
      setFile(null)
    } finally {
      setIsProcessing(false)
    }
  }

  // 开始上传
  const handleStartUpload = async () => {
    if (validationErrors.length > 0) {
      toast.error('请先修复验证错误')
      return
    }

    setStep('processing')
    setUploadProgress(0)

    try {
      const response = await fetch('/api/songs/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: previewData }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '上传失败')
      }

      setUploadProgress(100)
      setUploadResult(data.result)
      setStep('result')
      
      // 如果有成功的，通知父组件刷新
      if (data.result.success > 0) {
        onSuccess?.()
      }

    } catch (error: any) {
      console.error('上传失败:', error)
      toast.error(error.message || '上传失败')
      setStep('preview')
    }
  }

  // 关闭对话框
  const handleClose = () => {
    setOpen(false)
    setTimeout(resetState, 300) // 等待动画完成后重置
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            批量上传
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>批量上传歌曲</DialogTitle>
          <DialogDescription>
            下载模板，填写歌曲信息后上传
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* 步骤 1: 上传文件 */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              {/* 下载模板 */}
              <div className="space-y-3">
                <h3 className="font-semibold">第一步：下载模板</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={downloadExcelTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载 Excel 模板
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadCSVTemplate}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    下载 CSV 模板
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  推荐使用 Excel 模板，模板中包含示例数据供参考
                </p>
              </div>

              {/* 填写说明 */}
              <div className="space-y-3">
                <h3 className="font-semibold">第二步：填写歌曲信息</h3>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>填写说明</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <p><strong>必填字段：</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>歌曲ID - 抖音歌曲的唯一标识（纯数字）</li>
                      <li>追踪频率 - A/B/C（A=每小时，B=每6小时，C=每12小时）</li>
                      <li>歌名 - 新歌曲必须填写</li>
                      <li>歌手名 - 新歌曲必须填写</li>
                    </ul>
                    <p className="mt-2"><strong>可选字段：</strong></p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>专辑、歌手、作词、作曲等扩展信息</li>
                      <li>多个值用英文逗号分隔，例如：周杰伦,方文山</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              {/* 上传文件 */}
              <div className="space-y-3">
                <h3 className="font-semibold">第三步：上传文件</h3>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="file-upload">
                    <Button asChild disabled={isProcessing}>
                      <span className="cursor-pointer">
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            解析中...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            选择文件
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-muted-foreground mt-2">
                    支持 .csv 和 .xlsx 文件，最大 5MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 步骤 2: 预览数据 */}
          {step === 'preview' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">数据预览</h3>
                  <p className="text-sm text-muted-foreground">
                    共 {previewData.length} 首歌曲
                    {validationErrors.length > 0 && (
                      <span className="text-destructive ml-2">
                        · {validationErrors.length} 个错误
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                  重新选择
                </Button>
              </div>

              {/* 验证错误 */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>发现 {validationErrors.length} 个错误</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-32 mt-2">
                      <ul className="space-y-1 text-sm">
                        {validationErrors.map((error, index) => (
                          <li key={index}>
                            第 {error.row} 行 - {error.field}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* 数据预览表格 */}
              <div className="border rounded-lg">
                <ScrollArea className="h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">歌曲ID</th>
                        <th className="px-3 py-2 text-left">歌名</th>
                        <th className="px-3 py-2 text-left">歌手</th>
                        <th className="px-3 py-2 text-left">Rank</th>
                        <th className="px-3 py-2 text-left">扩展信息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 100).map((row, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2 font-mono text-xs">{row.song_id}</td>
                          <td className="px-3 py-2">{row.title || '-'}</td>
                          <td className="px-3 py-2">{row.artist || '-'}</td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 bg-muted rounded text-xs">
                              {row.rank}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {[
                              row.singers?.length > 0 && `歌手${row.singers.length}人`,
                              row.producers?.length > 0 && `制作${row.producers.length}人`,
                              row.genres?.length > 0 && `风格${row.genres.length}个`,
                            ].filter(Boolean).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewData.length > 100 && (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      仅显示前 100 条，共 {previewData.length} 条
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                  className="flex-1"
                >
                  返回
                </Button>
                <Button
                  onClick={handleStartUpload}
                  disabled={validationErrors.length > 0}
                  className="flex-1"
                >
                  {validationErrors.length > 0 ? '请先修复错误' : '开始上传'}
                </Button>
              </div>
            </div>
          )}

          {/* 步骤 3: 处理中 */}
          {step === 'processing' && (
            <div className="space-y-6 py-12 text-center">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg">正在处理...</h3>
                <p className="text-muted-foreground mt-2">
                  正在上传 {previewData.length} 首歌曲，请稍候
                </p>
              </div>
              <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
            </div>
          )}

          {/* 步骤 4: 结果 */}
          {step === 'result' && uploadResult && (
            <div className="space-y-6 py-4">
              {/* 统计摘要 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{uploadResult.total}</div>
                  <div className="text-sm text-muted-foreground">总计</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-600">{uploadResult.success}</div>
                  <div className="text-sm text-muted-foreground">成功</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <div className="text-2xl font-bold text-yellow-600">{uploadResult.skipped}</div>
                  <div className="text-sm text-muted-foreground">跳过</div>
                </div>
                <div className="text-center p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                  <div className="text-2xl font-bold text-red-600">{uploadResult.failed}</div>
                  <div className="text-sm text-muted-foreground">失败</div>
                </div>
              </div>

              {/* 详细结果 */}
              <div className="space-y-4">
                {/* 成功列表 */}
                {uploadResult.details.success.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold">成功添加 ({uploadResult.details.success.length})</h4>
                    </div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-1 text-sm">
                        {uploadResult.details.success.map((item, index) => (
                          <li key={index} className="text-muted-foreground">
                            第 {item.row} 行 - {item.title}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {/* 跳过列表 */}
                {uploadResult.details.skipped.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <h4 className="font-semibold">已跳过 ({uploadResult.details.skipped.length})</h4>
                    </div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-1 text-sm">
                        {uploadResult.details.skipped.map((item, index) => (
                          <li key={index} className="text-muted-foreground">
                            第 {item.row} 行 - {item.title} ({item.reason})
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}

                {/* 失败列表 */}
                {uploadResult.details.failed.length > 0 && (
                  <div className="border rounded-lg p-4 border-destructive">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <h4 className="font-semibold">失败 ({uploadResult.details.failed.length})</h4>
                    </div>
                    <ScrollArea className="h-32">
                      <ul className="space-y-1 text-sm">
                        {uploadResult.details.failed.map((item, index) => (
                          <li key={index} className="text-destructive">
                            第 {item.row} 行 - {item.song_id}: {item.error}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
              </div>

              {/* 关闭按钮 */}
              <Button onClick={handleClose} className="w-full">
                完成
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}