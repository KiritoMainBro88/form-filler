import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Alert, AlertDescription } from './ui/alert'
import { Play, FlaskConical, Loader2, ShieldAlert, ImageIcon } from 'lucide-react'
import type {
  AnswerPlan,
  ExecutionSettings,
  FillingProgress,
  FillingResult,
} from '../types'

interface ExecutionControlProps {
  plan: AnswerPlan | null
  execution: ExecutionSettings
  setExecution: (e: ExecutionSettings) => void
  isFilling: boolean
  fillingProgress: FillingProgress | null
  logs: string[]
  onFillingStarted: () => void
  onFillingProgress: (p: FillingProgress) => void
  onFillingCompleted: () => void
  addLog: (message: string) => void
}

export function ExecutionControl({
  plan,
  execution,
  setExecution,
  isFilling,
  fillingProgress,
  logs,
  onFillingStarted,
  onFillingProgress,
  onFillingCompleted,
  addLog,
}: ExecutionControlProps) {
  const [dryRunDone, setDryRunDone] = useState(false)
  const [result, setResult] = useState<FillingResult | null>(null)

  useEffect(() => {
    const handler = (progress: FillingProgress) => onFillingProgress(progress)
    window.electronAPI.onFillingProgress(handler)
    return () => window.electronAPI.removeAllListeners('filling-progress')
  }, [onFillingProgress])

  if (!plan) {
    return (
      <Alert>
        <AlertDescription>Chưa có kế hoạch để thực thi.</AlertDescription>
      </Alert>
    )
  }

  const run = async (dryRun: boolean) => {
    onFillingStarted()
    setResult(null)
    addLog(dryRun ? 'Bắt đầu chạy thử (không gửi form)...' : 'Bắt đầu chạy thật...')
    try {
      const res = await window.electronAPI.startFilling({ plan, execution, dryRun })
      setResult(res)
      if (dryRun) {
        setDryRunDone(true)
        addLog('Chạy thử xong. Kiểm tra ảnh chụp để duyệt trước khi chạy thật.')
      } else {
        addLog(`Hoàn tất: ${res.successCount}/${res.totalRuns} thành công, ${res.errorCount} lỗi.`)
      }
    } catch (error: any) {
      addLog(`Lỗi: ${error.message}`)
    } finally {
      onFillingCompleted()
    }
  }

  const progressPct = fillingProgress
    ? (fillingProgress.currentRun / Math.max(1, fillingProgress.totalRuns)) * 100
    : 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Thực thi
          </CardTitle>
          <CardDescription>{plan.formTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="runs">Số lần chạy</Label>
              <Input
                id="runs"
                type="number"
                min={1}
                max={500}
                value={execution.runs}
                onChange={(e) =>
                  setExecution({ ...execution, runs: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay">Độ trễ giữa các lần (ms)</Label>
              <Input
                id="delay"
                type="number"
                min={500}
                step={500}
                value={execution.delayBetweenRuns}
                onChange={(e) =>
                  setExecution({ ...execution, delayBetweenRuns: parseInt(e.target.value) || 2000 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="headless">Chế độ ẩn browser</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="headless"
                  checked={execution.headless}
                  onCheckedChange={(checked) => setExecution({ ...execution, headless: checked })}
                />
                <Label htmlFor="headless" className="text-sm">
                  {execution.headless ? 'Ẩn' : 'Hiện'}
                </Label>
              </div>
            </div>
          </div>

          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Bắt buộc chạy thử (dry-run) trước. Dry-run điền đầy đủ nhưng KHÔNG gửi form. Chỉ khi
              dry-run xong bạn mới mở khoá được nút chạy thật.
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => run(true)} disabled={isFilling} variant="outline">
              {isFilling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="mr-2 h-4 w-4" />
              )}
              Chạy thử (Dry-run)
            </Button>
            <Button onClick={() => run(false)} disabled={isFilling || !dryRunDone}>
              {isFilling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Chạy thật ({execution.runs} lần)
            </Button>
          </div>

          {fillingProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tiến độ</span>
                <Badge>{fillingProgress.status}</Badge>
              </div>
              <Progress value={progressPct} />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Lần {fillingProgress.currentRun}/{fillingProgress.totalRuns}
                </span>
                <span>
                  ✓ {fillingProgress.successCount} · ✕ {fillingProgress.errorCount}
                </span>
              </div>
              {fillingProgress.currentQuestion && (
                <p className="text-xs text-muted-foreground">
                  Đang xử lý: {fillingProgress.currentQuestion}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{result.dryRun ? 'Kết quả chạy thử' : 'Kết quả'}</CardTitle>
            <CardDescription>
              {result.successCount}/{result.totalRuns} thành công · {result.errorCount} lỗi ·{' '}
              {(result.duration / 1000).toFixed(1)}s
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.screenshots.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Ảnh chụp ({result.screenshots.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.screenshots.map((shot, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => window.electronAPI.openScreenshot(shot)}
                    >
                      Xem ảnh {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-600">Lỗi</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600">
                    Lần {e.run}: {e.error}
                  </p>
                ))}
              </div>
            )}

            {Object.keys(result.distribution).length > 0 && (
              <div className="space-y-2">
                <Separator />
                <p className="text-sm font-medium">Phân phối thực tế</p>
                <ScrollArea className="h-48 pr-3">
                  <div className="space-y-3">
                    {Object.entries(result.distribution).map(([id, d]) => (
                      <div key={id}>
                        <p className="text-xs font-medium">{d.question}</p>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(d.counts).map(([val, count]) => (
                            <span key={val} className="mr-3">
                              {val}: {count}
                            </span>
                          ))}
                          {Object.keys(d.counts).length === 0 && <span>(không có dữ liệu)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-56 w-full rounded border p-4">
            <div className="space-y-1">
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có logs</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-sm font-mono">
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
