import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { Checkbox } from './ui/checkbox'
import { Save, Settings, Loader2 } from 'lucide-react'
import { Question, FillStrategy, FormConfig, ExecutionSettings } from '../App'
import { SavedConfigurations } from './SavedConfigurations'

interface ConfigurationDashboardProps {
  questions: Question[]
  formTitle: string
  formUrl: string
  onConfigSaved: (config: FormConfig) => void
  addLog: (message: string) => void
}

export function ConfigurationDashboard({
  questions,
  formTitle,
  formUrl,
  onConfigSaved,
  addLog
}: ConfigurationDashboardProps) {
  const [fillStrategies, setFillStrategies] = useState<Record<string, FillStrategy>>({})
  const [executionSettings, setExecutionSettings] = useState<ExecutionSettings>({
    runs: 1,
    delayBetweenRuns: 2000,
    headless: false,
  })
  const [configName, setConfigName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedConfigs, setShowSavedConfigs] = useState(false)

  const getQuestionTypeLabel = (type: Question['type']): string => {
    const labels = {
      text: 'Văn bản ngắn',
      paragraph: 'Văn bản dài',
      multiple_choice: 'Lựa chọn đơn',
      checkbox: 'Lựa chọn nhiều',
      dropdown: 'Danh sách thả xuống',
      linear_scale: 'Thang điểm',
      multiple_choice_grid: 'Lưới lựa chọn đơn',
      checkbox_grid: 'Lưới lựa chọn nhiều',
      date: 'Ngày',
      time: 'Thời gian',
      file_upload: 'Tải lên tệp',
    }
    return labels[type] || type
  }

  const getQuestionTypeColor = (type: Question['type']): string => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      paragraph: 'bg-blue-100 text-blue-800',
      multiple_choice: 'bg-green-100 text-green-800',
      checkbox: 'bg-green-100 text-green-800',
      dropdown: 'bg-purple-100 text-purple-800',
      linear_scale: 'bg-orange-100 text-orange-800',
      multiple_choice_grid: 'bg-indigo-100 text-indigo-800',
      checkbox_grid: 'bg-indigo-100 text-indigo-800',
      date: 'bg-pink-100 text-pink-800',
      time: 'bg-pink-100 text-pink-800',
      file_upload: 'bg-red-100 text-red-800',
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const updateFillStrategy = (questionId: string, strategy: FillStrategy) => {
    setFillStrategies(prev => ({
      ...prev,
      [questionId]: strategy
    }))
  }

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      addLog('Vui lòng nhập tên cấu hình')
      return
    }

    setIsSaving(true)
    addLog('Đang lưu cấu hình...')

    try {
      const config: FormConfig = {
        formUrl,
        formTitle,
        savedAt: new Date().toISOString(),
        fillStrategies,
        executionSettings,
      }

      await window.electronAPI.saveConfig(config, configName)
      onConfigSaved(config)
      addLog(`Cấu hình "${configName}" đã được lưu thành công`)
    } catch (error: any) {
      addLog(`Lỗi khi lưu cấu hình: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoadConfig = (config: FormConfig) => {
    setFillStrategies(config.fillStrategies || {})
    setExecutionSettings(config.executionSettings || {
      runs: 1,
      delayBetweenRuns: 2000,
      headless: false,
    })
    setConfigName('')
    setShowSavedConfigs(false)
  }

  const getDefaultStrategy = (question: Question): FillStrategy => {
    switch (question.type) {
      case 'text':
      case 'paragraph':
        return { strategy: 'random' }
      case 'multiple_choice':
      case 'dropdown':
        return { strategy: 'random' }
      case 'checkbox':
        return { strategy: 'random' }
      case 'linear_scale':
        return { strategy: 'random' }
      case 'date':
      case 'time':
        return { strategy: 'random' }
      case 'file_upload':
        return { strategy: 'skip' }
      default:
        return { strategy: 'random' }
    }
  }

  return (
    <div className="space-y-6">
      {showSavedConfigs ? (
        <SavedConfigurations onLoadConfig={handleLoadConfig} addLog={addLog} />
      ) : (
        <>
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cấu hình Form
          </CardTitle>
          <CardDescription>
            {formTitle} - {questions.length} câu hỏi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="runs">Số lần chạy</Label>
                <Input
                  id="runs"
                  type="number"
                  min="1"
                  max="100"
                  value={executionSettings.runs}
                  onChange={(e) => setExecutionSettings(prev => ({
                    ...prev,
                    runs: parseInt(e.target.value) || 1
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delay">Độ trễ giữa các lần (ms)</Label>
                <Input
                  id="delay"
                  type="number"
                  min="1000"
                  max="10000"
                  step="500"
                  value={executionSettings.delayBetweenRuns}
                  onChange={(e) => setExecutionSettings(prev => ({
                    ...prev,
                    delayBetweenRuns: parseInt(e.target.value) || 2000
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headless">Chế độ ẩn</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="headless"
                    checked={executionSettings.headless}
                    onCheckedChange={(checked) => setExecutionSettings(prev => ({
                      ...prev,
                      headless: checked
                    }))}
                  />
                  <Label htmlFor="headless" className="text-sm">
                    {executionSettings.headless ? 'Ẩn browser' : 'Hiện browser'}
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Câu hỏi và Chiến lược điền</CardTitle>
          <CardDescription>
            Cấu hình cách điền cho từng câu hỏi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {questions.map((question, index) => {
                const currentStrategy = fillStrategies[question.id] || getDefaultStrategy(question)
                
                return (
                  <div key={question.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            Câu {index + 1}
                          </span>
                          <Badge className={getQuestionTypeColor(question.type)}>
                            {getQuestionTypeLabel(question.type)}
                          </Badge>
                          {question.required && (
                            <Badge variant="destructive">Bắt buộc</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{question.question}</p>
                        {question.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {question.description}
                          </p>
                        )}
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Tùy chọn:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {question.options.map((option, optIndex) => (
                                <Badge key={optIndex} variant="outline" className="text-xs">
                                  {option}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Chiến lược điền</Label>
                        <Select
                          value={currentStrategy.strategy}
                          onValueChange={(value: FillStrategy['strategy']) => {
                            updateFillStrategy(question.id, {
                              ...currentStrategy,
                              strategy: value
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">Ngẫu nhiên</SelectItem>
                            <SelectItem value="fixed">Giá trị cố định</SelectItem>
                            <SelectItem value="sequential">Tuần tự</SelectItem>
                            <SelectItem value="pattern">Theo mẫu</SelectItem>
                            <SelectItem value="skip">Bỏ qua</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show value input for non-skip strategies */}
                      {currentStrategy.strategy !== 'skip' && currentStrategy.strategy !== 'random' && (
                        <div className="space-y-2">
                          <Label>
                            {currentStrategy.strategy === 'fixed' ? 'Giá trị' : 
                             currentStrategy.strategy === 'pattern' ? 'Mẫu' : 'Giá trị'}
                          </Label>
                          <Input
                            placeholder={
                              currentStrategy.strategy === 'pattern' 
                                ? 'Ví dụ: user{random}@example.com'
                                : 'Nhập giá trị...'
                            }
                            value={currentStrategy.value || ''}
                            onChange={(e) => updateFillStrategy(question.id, {
                              ...currentStrategy,
                              value: e.target.value
                            })}
                          />
                        </div>
                      )}

                      {/* Show option selection for multiple choice and checkbox */}
                      {(question.type === 'multiple_choice' || question.type === 'checkbox') && 
                       currentStrategy.strategy !== 'skip' && question.options && question.options.length > 0 && (
                        <div className="space-y-2">
                          <Label>
                            {question.type === 'multiple_choice' ? 'Chọn tùy chọn' : 'Chọn các tùy chọn'}
                          </Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${question.id}-option-${optIndex}`}
                                  checked={currentStrategy.selectedOptions?.includes(option) || false}
                                  onCheckedChange={(checked) => {
                                    const currentOptions = currentStrategy.selectedOptions || []
                                    let newOptions
                                    if (question.type === 'multiple_choice') {
                                      // Single selection for multiple choice
                                      newOptions = checked ? [option] : []
                                    } else {
                                      // Multiple selection for checkbox
                                      newOptions = checked 
                                        ? [...currentOptions, option]
                                        : currentOptions.filter(opt => opt !== option)
                                    }
                                    updateFillStrategy(question.id, {
                                      ...currentStrategy,
                                      selectedOptions: newOptions
                                    })
                                  }}
                                />
                                <Label 
                                  htmlFor={`${question.id}-option-${optIndex}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Lưu cấu hình
          </CardTitle>
          <CardDescription>
            Lưu cấu hình để sử dụng lại sau này
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="config-name">Tên cấu hình</Label>
              <Input
                id="config-name"
                placeholder="Nhập tên cấu hình..."
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleSaveConfig}
                disabled={isSaving || !configName.trim()}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu cấu hình
                  </>
                )}
              </Button>
              
              <Button 
                onClick={() => setShowSavedConfigs(!showSavedConfigs)}
                variant="outline"
                className="w-full"
              >
                {showSavedConfigs ? 'Tạo cấu hình mới' : 'Xem cấu hình đã lưu'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}
