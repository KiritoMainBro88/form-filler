import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Loader2, FolderOpen, Trash2, Edit, Calendar } from 'lucide-react'
import { FormConfig } from '../App'

interface SavedConfigurationsProps {
  onLoadConfig: (config: FormConfig) => void
  addLog: (message: string) => void
}

export function SavedConfigurations({ onLoadConfig, addLog }: SavedConfigurationsProps) {
  const [configs, setConfigs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null)

  const loadConfigs = async () => {
    setLoading(true)
    try {
      const configList = await window.electronAPI.listConfigs()
      setConfigs(configList)
      addLog(`Đã tải ${configList.length} cấu hình`)
    } catch (error: any) {
      addLog(`Lỗi khi tải danh sách cấu hình: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadConfig = async (configName: string) => {
    try {
      const config = await window.electronAPI.loadConfig(configName)
      onLoadConfig(config)
      setSelectedConfig(configName)
      addLog(`Đã tải cấu hình: ${configName}`)
    } catch (error: any) {
      addLog(`Lỗi khi tải cấu hình: ${error.message}`)
    }
  }

  const formatConfigName = (configName: string): string => {
    // Remove timestamp suffix if present
    const parts = configName.split('_')
    if (parts.length > 1 && parts[parts.length - 1].match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)) {
      return parts.slice(0, -1).join('_')
    }
    return configName
  }

  const getConfigDate = (configName: string): string => {
    const parts = configName.split('_')
    const lastPart = parts[parts.length - 1]
    if (lastPart.match(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)) {
      const dateStr = lastPart.replace(/-/g, ':').replace('T', ' ').substring(0, 19)
      return new Date(dateStr).toLocaleString('vi-VN')
    }
    return 'Không xác định'
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Cấu hình đã lưu
        </CardTitle>
        <CardDescription>
          Tải và sử dụng các cấu hình đã lưu trước đó
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={loadConfigs} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              <>
                <FolderOpen className="mr-2 h-4 w-4" />
                Tải lại danh sách
              </>
            )}
          </Button>

          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có cấu hình nào được lưu</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {configs.map((configName) => (
                  <div
                    key={configName}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConfig === configName
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleLoadConfig(configName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {formatConfigName(configName)}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {getConfigDate(configName)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLoadConfig(configName)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
