import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2, ExternalLink, AlertCircle } from 'lucide-react'

interface FormUrlInputProps {
  formUrl: string
  setFormUrl: (url: string) => void
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void
  onFormScanned: (result: any) => void
  addLog: (message: string) => void
}

export function FormUrlInput({
  formUrl,
  setFormUrl,
  isScanning,
  setIsScanning,
  onFormScanned,
  addLog
}: FormUrlInputProps) {
  const [error, setError] = useState<string>('')

  const validateGoogleFormUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('docs.google.com') && urlObj.pathname.includes('/forms/')
    } catch {
      return false
    }
  }

  const handleScan = async () => {
    if (!formUrl.trim()) {
      setError('Vui lòng nhập URL Google Form')
      return
    }

    if (!validateGoogleFormUrl(formUrl)) {
      setError('URL không hợp lệ. Vui lòng nhập URL Google Form đúng định dạng')
      return
    }

    setError('')
    setIsScanning(true)
    addLog('Bắt đầu quét form...')

    try {
      const result = await window.electronAPI.scanForm(formUrl)
      onFormScanned(result)
    } catch (error: any) {
      setError(`Lỗi khi quét form: ${error.message}`)
      addLog(`Lỗi: ${error.message}`)
    } finally {
      setIsScanning(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isScanning) {
      handleScan()
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Quét Google Form
          </CardTitle>
          <CardDescription>
            Nhập URL của Google Form để bắt đầu quét và phân tích cấu trúc form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="form-url">URL Google Form</Label>
            <Input
              id="form-url"
              type="url"
              placeholder="https://docs.google.com/forms/d/..."
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isScanning}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleScan} 
              disabled={isScanning || !formUrl.trim()}
              className="flex-1"
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang quét...
                </>
              ) : (
                'Quét Form'
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Hướng dẫn:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Copy URL từ Google Form (dạng: https://docs.google.com/forms/d/...)</li>
              <li>Form phải ở chế độ công khai hoặc bạn có quyền truy cập</li>
              <li>Tool sẽ quét tất cả loại câu hỏi: text, multiple choice, checkbox, dropdown, scale, date, time, file upload</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
