import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Alert, AlertDescription } from './ui/alert'
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react'
import type {
  AnswerPlan,
  QuestionPlan,
  PlanValidationResult,
  PlanValidationIssue,
} from '../types'

interface PlanEditorProps {
  plan: AnswerPlan | null
  setPlan: (plan: AnswerPlan) => void
  onPlanReady: () => void
  addLog: (message: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  text: 'Văn bản ngắn',
  paragraph: 'Văn bản dài',
  multiple_choice: 'Chọn 1',
  checkbox: 'Chọn nhiều',
  dropdown: 'Danh sách',
  linear_scale: 'Thang điểm',
  date: 'Ngày',
  time: 'Giờ',
  file_upload: 'Tải tệp (bỏ qua)',
  unsupported: 'Không hỗ trợ',
}

const SINGLE_CHOICE = ['multiple_choice', 'dropdown', 'linear_scale']
const TEXT_TYPES = ['text', 'paragraph', 'date', 'time']

export function PlanEditor({ plan, setPlan, onPlanReady, addLog }: PlanEditorProps) {
  const [validation, setValidation] = useState<PlanValidationResult | null>(null)

  if (!plan) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Chưa có kế hoạch. Hãy quét form trước.</AlertDescription>
      </Alert>
    )
  }

  const issuesById = (id: string): PlanValidationIssue[] =>
    validation?.issues.filter((i) => i.questionId === id) || []

  const updateQuestion = (qid: string, updater: (q: QuestionPlan) => QuestionPlan) => {
    const next: AnswerPlan = {
      ...plan,
      questions: plan.questions.map((q) => (q.id === qid ? updater(q) : q)),
    }
    setPlan(next)
  }

  const setAnswerWeight = (qid: string, index: number, weight: number) => {
    updateQuestion(qid, (q) => {
      const answers = q.answers.map((a, i) => (i === index ? { ...a, weight } : a))
      return { ...q, answers }
    })
  }

  const setAnswerValue = (qid: string, index: number, value: string) => {
    updateQuestion(qid, (q) => {
      const answers = q.answers.map((a, i) => (i === index ? { ...a, value } : a))
      return { ...q, answers }
    })
  }

  const addTextAnswer = (qid: string) => {
    updateQuestion(qid, (q) => ({ ...q, answers: [...q.answers, { value: '', weight: 1 }] }))
  }

  const removeTextAnswer = (qid: string, index: number) => {
    updateQuestion(qid, (q) => ({ ...q, answers: q.answers.filter((_, i) => i !== index) }))
  }

  const setCheckboxBound = (qid: string, key: 'minSelections' | 'maxSelections', value: number) => {
    updateQuestion(qid, (q) => ({ ...q, [key]: value }))
  }

  const handleValidate = async () => {
    const result = await window.electronAPI.validatePlan(plan)
    setValidation(result)
    if (result.valid) {
      addLog('Kế hoạch hợp lệ.')
    } else {
      const errors = result.issues.filter((i) => i.severity === 'error').length
      addLog(`Kế hoạch có ${errors} lỗi cần sửa.`)
    }
    return result
  }

  const handleExport = async () => {
    const saved = await window.electronAPI.exportPlan(plan)
    if (saved) addLog(`Đã xuất kế hoạch: ${saved}`)
  }

  const handleImport = async () => {
    const imported = await window.electronAPI.importPlan()
    if (!imported) return
    setPlan(imported.plan)
    setValidation(imported.validation)
    if (imported.validation.valid) {
      addLog('Đã nhập kế hoạch hợp lệ.')
    } else {
      const errors = imported.validation.issues.filter((i) => i.severity === 'error').length
      addLog(`Đã nhập kế hoạch nhưng có ${errors} lỗi cần sửa.`)
    }
  }

  const handleContinue = async () => {
    const result = await handleValidate()
    if (result.valid) onPlanReady()
  }

  const errorCount = validation?.issues.filter((i) => i.severity === 'error').length || 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{plan.formTitle}</CardTitle>
          <CardDescription>
            {plan.questions.length} câu hỏi · {plan.pageCount} trang. Chỉnh tỉ lệ % cho mỗi đáp án,
            hoặc xuất JSON để nhờ AI điền nội dung rồi nhập lại.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Xuất JSON (cho AI)
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Nhập JSON
            </Button>
            <Button variant="outline" onClick={handleValidate}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Kiểm tra
            </Button>
          </div>

          {validation && (
            <Alert variant={validation.valid ? 'default' : 'destructive'}>
              {validation.valid ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {validation.valid
                  ? 'Kế hoạch hợp lệ, sẵn sàng chạy.'
                  : `Có ${errorCount} lỗi cần sửa trước khi chạy.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi & tỉ lệ trả lời</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[28rem] pr-3">
            <div className="space-y-4">
              {plan.questions.map((q, idx) => {
                const qIssues = issuesById(q.id)
                const hasError = qIssues.some((i) => i.severity === 'error')
                return (
                  <div
                    key={q.id}
                    className={`border rounded-lg p-4 space-y-3 ${
                      hasError ? 'border-red-400 bg-red-50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Câu {idx + 1}</span>
                          <Badge variant="outline">{TYPE_LABELS[q.type] || q.type}</Badge>
                          <Badge variant="outline">Trang {q.page}</Badge>
                          {q.required && <Badge variant="destructive">Bắt buộc</Badge>}
                        </div>
                        <p className="text-sm font-medium">{q.question}</p>
                      </div>
                    </div>

                    {qIssues.length > 0 && (
                      <div className="space-y-1">
                        {qIssues.map((issue, i) => (
                          <p
                            key={i}
                            className={`text-xs ${
                              issue.severity === 'error' ? 'text-red-600' : 'text-amber-600'
                            }`}
                          >
                            {issue.severity === 'error' ? '✕' : '⚠'} {issue.message}
                          </p>
                        ))}
                      </div>
                    )}

                    <Separator />

                    {(SINGLE_CHOICE.includes(q.type) || q.type === 'checkbox') &&
                      q.answers.length > 0 && (
                        <div className="space-y-3">
                          {q.type === 'checkbox' && (
                            <p className="text-xs text-muted-foreground">
                              Mỗi đáp án là xác suất % được tick độc lập.
                            </p>
                          )}
                          {SINGLE_CHOICE.includes(q.type) && (
                            <p className="text-xs text-muted-foreground">
                              Tỉ lệ tương đối giữa các đáp án (hệ thống tự chuẩn hoá).
                            </p>
                          )}
                          {q.answers.map((a, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-sm flex-1 truncate" title={a.value}>
                                {a.value}
                              </span>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={a.weight}
                                onChange={(e) =>
                                  setAnswerWeight(q.id, i, Number(e.target.value))
                                }
                                className="w-40"
                              />
                              <span className="text-sm w-10 text-right tabular-nums">
                                {a.weight}
                              </span>
                            </div>
                          ))}

                          {q.type === 'checkbox' && (
                            <div className="flex items-center gap-4 pt-1">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Tối thiểu</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={q.options?.length || 0}
                                  value={q.minSelections ?? 0}
                                  onChange={(e) =>
                                    setCheckboxBound(q.id, 'minSelections', Number(e.target.value))
                                  }
                                  className="w-20 h-8"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs">Tối đa</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={q.options?.length || 0}
                                  value={q.maxSelections ?? q.options?.length ?? 0}
                                  onChange={(e) =>
                                    setCheckboxBound(q.id, 'maxSelections', Number(e.target.value))
                                  }
                                  className="w-20 h-8"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    {TEXT_TYPES.includes(q.type) && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Danh sách câu trả lời mẫu (chọn ngẫu nhiên theo tỉ lệ). Để trống nếu nhờ AI điền.
                        </p>
                        {q.answers.map((a, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              value={a.value}
                              placeholder={
                                q.type === 'date'
                                  ? 'YYYY-MM-DD'
                                  : q.type === 'time'
                                    ? 'HH:MM'
                                    : 'Nội dung trả lời...'
                              }
                              onChange={(e) => setAnswerValue(q.id, i, e.target.value)}
                            />
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={a.weight}
                              onChange={(e) => setAnswerWeight(q.id, i, Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-xs w-8 text-right tabular-nums">{a.weight}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTextAnswer(q.id, i)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addTextAnswer(q.id)}>
                          <Plus className="mr-1 h-3 w-3" />
                          Thêm câu trả lời
                        </Button>
                      </div>
                    )}

                    {(q.type === 'file_upload' || q.type === 'unsupported') && (
                      <p className="text-xs text-muted-foreground">
                        Loại câu hỏi này sẽ được bỏ qua khi điền.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleContinue}>
          Tiếp tục
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
