import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Play, SlidersHorizontal, Search } from 'lucide-react'
import { FormUrlInput } from './components/FormUrlInput'
import { PlanEditor } from './components/PlanEditor'
import { ExecutionControl } from './components/ExecutionControl'
import type { AnswerPlan, ScanResult, ExecutionSettings, FillingProgress } from './types'
import './types'

function App() {
  const [currentTab, setCurrentTab] = useState('scan')
  const [formUrl, setFormUrl] = useState('')
  const [plan, setPlan] = useState<AnswerPlan | null>(null)
  const [execution, setExecution] = useState<ExecutionSettings>({
    runs: 1,
    delayBetweenRuns: 3000,
    headless: false,
  })
  const [isScanning, setIsScanning] = useState(false)
  const [isFilling, setIsFilling] = useState(false)
  const [fillingProgress, setFillingProgress] = useState<FillingProgress | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  const handleFormScanned = async (result: ScanResult) => {
    addLog(`Quét xong: ${result.questions.length} câu hỏi qua ${result.pageCount} trang`)
    try {
      const template = await window.electronAPI.buildPlan(result)
      setPlan(template)
      setCurrentTab('plan')
      addLog('Đã tạo kế hoạch trả lời mẫu. Hãy chỉnh tỉ lệ hoặc gửi JSON cho AI điền nội dung.')
    } catch (error: any) {
      addLog(`Lỗi tạo kế hoạch: ${error.message}`)
    }
  }

  const handlePlanReady = () => {
    setCurrentTab('execute')
  }

  const handleFillingStarted = () => {
    setIsFilling(true)
    setFillingProgress(null)
  }

  const handleFillingProgress = (progress: FillingProgress) => {
    setFillingProgress(progress)
    addLog(progress.message)
  }

  const handleFillingCompleted = () => {
    setIsFilling(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Google Form Auto-Fill Tool</h1>
          <p className="text-muted-foreground text-center">
            Quét form, lập kế hoạch trả lời theo tỉ lệ, chạy thử rồi điền tự động
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              1. Quét Form
            </TabsTrigger>
            <TabsTrigger value="plan" className="flex items-center gap-2" disabled={!plan}>
              <SlidersHorizontal className="h-4 w-4" />
              2. Kế hoạch trả lời
            </TabsTrigger>
            <TabsTrigger value="execute" className="flex items-center gap-2" disabled={!plan}>
              <Play className="h-4 w-4" />
              3. Thực thi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="mt-6">
            <FormUrlInput
              formUrl={formUrl}
              setFormUrl={setFormUrl}
              isScanning={isScanning}
              setIsScanning={setIsScanning}
              onFormScanned={handleFormScanned}
              addLog={addLog}
            />
          </TabsContent>

          <TabsContent value="plan" className="mt-6">
            <PlanEditor
              plan={plan}
              setPlan={setPlan}
              onPlanReady={handlePlanReady}
              addLog={addLog}
            />
          </TabsContent>

          <TabsContent value="execute" className="mt-6">
            <ExecutionControl
              plan={plan}
              execution={execution}
              setExecution={setExecution}
              isFilling={isFilling}
              fillingProgress={fillingProgress}
              logs={logs}
              onFillingStarted={handleFillingStarted}
              onFillingProgress={handleFillingProgress}
              onFillingCompleted={handleFillingCompleted}
              addLog={addLog}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
