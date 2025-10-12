import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Alert, AlertDescription } from './ui/alert'
import { Play, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { FormConfig, FillingProgress } from '../App'

interface ExecutionControlProps {
  config: FormConfig | null
  isFilling: boolean
  fillingProgress: FillingProgress | null
  logs: string[]
  onFillingStarted: () => void
  onFillingProgress: (progress: FillingProgress) => void
  onFillingCompleted: (result: any) => void
  addLog: (message: string) => void
}

export function ExecutionControl({
  config,
  isFilling,
  fillingProgress,
  logs,
  onFillingStarted,
  onFillingProgress,
  onFillingCompleted,
  addLog
}: ExecutionControlProps) {
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    // Listen for progress updates from main process
    const handleProgress = (progress: FillingProgress) => {
      onFillingProgress(progress)
    }

    window.electronAPI.onFillingProgress(handleProgress)

    return () => {
      window.electronAPI.removeAllListeners('filling-progress')
    }
  }, [onFillingProgress])

  const handleStartFilling = async () => {
    if (!config) {
      addLog('Không có cấu hình để thực thi')
      return
    }

    setIsStarting(true)
    onFillingStarted()

    try {
      const result = await window.electronAPI.startFilling(config)
      onFillingCompleted(result)
    } catch (error: any) {
      addLog(`Lỗi khi thực thi: ${error.message}`)
    } finally {
      setIsStarting(false)
    }
  }

  const getStatusIcon = (status: FillingProgress['status']) => {
    switch (status) {
      case 'starting':
        return <Clock className="h-4 w-4" />
      case 'filling':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'submitting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: FillingProgress['status']) => {
    switch (status) {
      case 'starting':
        return 'bg-blue-100 text-blue-800'
      case 'filling':
        return 'bg-yellow-100 text-yellow-800'
      case 'submitting':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: FillingProgress['status']) => {
    switch (status) {
      case 'starting':
        return 'Đang bắt đầu'
      case 'filling':
        return 'Đang điền form'
      case 'submitting':
        return 'Đang gửi form'
      case 'completed':
        return 'Hoàn thành'
      case 'error':
        return 'Lỗi'
      default:
        return 'Chờ'
    }
  }

  const progressPercentage = fillingProgress 
    ? (fillingProgress.currentRun / fillingProgress.totalRuns) * 100 
    : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Thực thi Form Filling
          </CardTitle>
          <CardDescription>
            {config ? `Cấu hình: ${config.formTitle}` : 'Chưa có cấu hình'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {config ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{config.executionSettings.runs}</div>
                  <div className="text-sm text-muted-foreground">Số lần chạy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{config.executionSettings.delayBetweenRuns}ms</div>
                  <div className="text-sm text-muted-foreground">Độ trễ</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {config.executionSettings.headless ? 'Ẩn' : 'Hiện'}
                  </div>
                  <div className="text-sm text-muted-foreground">Chế độ browser</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tiến độ</span>
                  {fillingProgress && (
                    <Badge className={getStatusColor(fillingProgress.status)}>
                      {getStatusIcon(fillingProgress.status)}
                      <span className="ml-1">{getStatusLabel(fillingProgress.status)}</span>
                    </Badge>
                  )}
                </div>

                {fillingProgress && (
                  <div className="space-y-2">
                    <Progress value={progressPercentage} className="w-full" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Lần {fillingProgress.currentRun}/{fillingProgress.totalRuns}</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                  </div>
                )}

                {fillingProgress && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">
                        {fillingProgress.successCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Thành công</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">
                        {fillingProgress.errorCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Lỗi</div>
                    </div>
                  </div>
                )}

                {fillingProgress?.currentQuestion && (
                  <Alert>
                    <AlertDescription>
                      <strong>Đang xử lý:</strong> {fillingProgress.currentQuestion}
                    </AlertDescription>
                  </Alert>
                )}

                {fillingProgress?.message && (
                  <Alert>
                    <AlertDescription>
                      {fillingProgress.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={handleStartFilling}
                  disabled={isFilling || isStarting}
                  className="flex-1"
                >
                  {isFilling || isStarting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isStarting ? 'Đang bắt đầu...' : 'Đang chạy...'}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Bắt đầu
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                Vui lòng quét form và lưu cấu hình trước khi thực thi.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            Theo dõi quá trình thực thi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 w-full rounded border p-4">
            <div className="space-y-1">
              {logs.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Chưa có logs
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
