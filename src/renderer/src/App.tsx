import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Play, Save, Settings } from 'lucide-react'
import { FormUrlInput } from './components/FormUrlInput'
import { ConfigurationDashboard } from './components/ConfigurationDashboard'
import { ExecutionControl } from './components/ExecutionControl'
import './types'

export interface Question {
  id: string;
  type: 'text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'linear_scale' | 'multiple_choice_grid' | 'checkbox_grid' | 'date' | 'time' | 'file_upload';
  question: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  description?: string;
}

export interface FillStrategy {
  strategy: 'random' | 'fixed' | 'sequential' | 'pattern' | 'skip';
  value?: string | number;
  pattern?: string;
  selectedOptions?: string[];
}

export interface ExecutionSettings {
  runs: number;
  delayBetweenRuns: number;
  headless: boolean;
}

export interface FormConfig {
  formUrl: string;
  formTitle: string;
  savedAt: string;
  fillStrategies: Record<string, FillStrategy>;
  executionSettings: ExecutionSettings;
}

export interface FillingProgress {
  currentRun: number;
  totalRuns: number;
  currentQuestion?: string;
  status: 'starting' | 'filling' | 'submitting' | 'completed' | 'error';
  message: string;
  successCount: number;
  errorCount: number;
}

function App() {
  const [currentTab, setCurrentTab] = useState('scan')
  const [formUrl, setFormUrl] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [formTitle, setFormTitle] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [config, setConfig] = useState<FormConfig | null>(null)
  const [isFilling, setIsFilling] = useState(false)
  const [fillingProgress, setFillingProgress] = useState<FillingProgress | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleFormScanned = (result: any) => {
    setQuestions(result.questions)
    setFormTitle(result.formTitle)
    setCurrentTab('configure')
    addLog(`Form scanned successfully: ${result.questions.length} questions found`)
  }

  const handleConfigSaved = (savedConfig: FormConfig) => {
    setConfig(savedConfig)
    addLog('Configuration saved successfully')
  }

  const handleFillingStarted = () => {
    setIsFilling(true)
    setCurrentTab('execute')
    addLog('Form filling started')
  }

  const handleFillingProgress = (progress: FillingProgress) => {
    setFillingProgress(progress)
    addLog(progress.message)
  }

  const handleFillingCompleted = (result: any) => {
    setIsFilling(false)
    setFillingProgress(null)
    addLog(`Form filling completed: ${result.successCount}/${result.totalRuns} successful`)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            Google Form Auto-Fill Tool
          </h1>
          <p className="text-muted-foreground text-center">
            Tự động quét và điền Google Form với nhiều chiến lược
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Quét Form
            </TabsTrigger>
            <TabsTrigger value="configure" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="execute" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Thực thi
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

          <TabsContent value="configure" className="mt-6">
            <ConfigurationDashboard
              questions={questions}
              formTitle={formTitle}
              formUrl={formUrl}
              onConfigSaved={handleConfigSaved}
              addLog={addLog}
            />
          </TabsContent>

          <TabsContent value="execute" className="mt-6">
            <ExecutionControl
              config={config}
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
