import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Download, 
  Upload, 
  Copy, 
  Share2, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Info,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { ExportImportManager, ExportPackage, ImportResult } from '../utils/ExportImportManager';
import { AdvancedScanResult } from '../scanner/AdvancedFormScanner';
import { FormTemplate } from '../templates/FormTemplates';
import { BatchJob } from '../batch/BatchProcessor';

interface ExportImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportData?: {
    scanResult?: AdvancedScanResult;
    fillStrategies?: Map<string, string>;
    customValues?: Map<string, any>;
    executionSettings?: any;
    template?: FormTemplate;
    batchJob?: BatchJob;
  };
  onImport?: (result: ImportResult) => void;
}

const ExportImportDialog: React.FC<ExportImportDialogProps> = ({
  isOpen,
  onClose,
  exportData,
  onImport
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportType, setExportType] = useState<'configuration' | 'template' | 'batch_job' | 'complete'>('configuration');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const exportManager = new ExportImportManager();

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!exportData) return;

    setLoading(true);
    try {
      let package_: ExportPackage;

      switch (exportType) {
        case 'configuration':
          if (!exportData.scanResult || !exportData.fillStrategies) {
            throw new Error('Configuration data is incomplete');
          }
          package_ = exportManager.exportConfiguration(
            exportData.scanResult,
            exportData.fillStrategies,
            exportData.customValues || new Map(),
            exportData.executionSettings || {},
            {
              name: `${exportData.scanResult.formTitle} Configuration`,
              description: `Configuration for ${exportData.scanResult.formTitle}`,
              author: 'User',
              tags: ['configuration', 'auto-fill']
            }
          );
          break;

        case 'template':
          if (!exportData.template) {
            throw new Error('Template data is missing');
          }
          package_ = exportManager.exportTemplate(exportData.template);
          break;

        case 'batch_job':
          if (!exportData.batchJob) {
            throw new Error('Batch job data is missing');
          }
          package_ = exportManager.exportBatchJob(exportData.batchJob);
          break;

        default:
          throw new Error('Unsupported export type');
      }

      // Show preview
      setPreviewData(exportManager.getExportPreview(package_));
      setShowPreview(true);

    } catch (error: any) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!exportData) return;

    try {
      let package_: ExportPackage;

      switch (exportType) {
        case 'configuration':
          if (!exportData.scanResult || !exportData.fillStrategies) {
            throw new Error('Configuration data is incomplete');
          }
          package_ = exportManager.exportConfiguration(
            exportData.scanResult,
            exportData.fillStrategies,
            exportData.customValues || new Map(),
            exportData.executionSettings || {}
          );
          break;

        case 'template':
          if (!exportData.template) {
            throw new Error('Template data is missing');
          }
          package_ = exportManager.exportTemplate(exportData.template);
          break;

        case 'batch_job':
          if (!exportData.batchJob) {
            throw new Error('Batch job data is missing');
          }
          package_ = exportManager.exportBatchJob(exportData.batchJob);
          break;

        default:
          throw new Error('Unsupported export type');
      }

      exportManager.exportToFile(package_);
    } catch (error: any) {
      console.error('Download failed:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!exportData) return;

    try {
      let package_: ExportPackage;

      switch (exportType) {
        case 'configuration':
          if (!exportData.scanResult || !exportData.fillStrategies) {
            throw new Error('Configuration data is incomplete');
          }
          package_ = exportManager.exportConfiguration(
            exportData.scanResult,
            exportData.fillStrategies,
            exportData.customValues || new Map(),
            exportData.executionSettings || {}
          );
          break;

        case 'template':
          if (!exportData.template) {
            throw new Error('Template data is missing');
          }
          package_ = exportManager.exportTemplate(exportData.template);
          break;

        case 'batch_job':
          if (!exportData.batchJob) {
            throw new Error('Batch job data is missing');
          }
          package_ = exportManager.exportBatchJob(exportData.batchJob);
          break;

        default:
          throw new Error('Unsupported export type');
      }

      await exportManager.exportToClipboard(package_);
      alert('Configuration copied to clipboard!');
    } catch (error: any) {
      console.error('Copy failed:', error);
      alert('Copy failed: ' + error.message);
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!exportManager.isFileSupported(file.name)) {
      alert('Unsupported file format. Please select a JSON file.');
      return;
    }

    if (file.size > exportManager.getMaxFileSize()) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    setLoading(true);
    try {
      const result = await exportManager.importFromFile(file);
      setImportResult(result);
      
      if (onImport) {
        onImport(result);
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardImport = async () => {
    setLoading(true);
    try {
      const result = await exportManager.importFromClipboard();
      setImportResult(result);
      
      if (onImport) {
        onImport(result);
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getExportTypeDescription = (type: string) => {
    switch (type) {
      case 'configuration':
        return 'Export form configuration with fill strategies and settings';
      case 'template':
        return 'Export reusable template for similar forms';
      case 'batch_job':
        return 'Export batch processing job configuration';
      case 'complete':
        return 'Export all configurations, templates, and batch jobs';
      default:
        return '';
    }
  };

  const getAvailableExportTypes = () => {
    const types = [];
    
    if (exportData?.scanResult && exportData?.fillStrategies) {
      types.push('configuration');
    }
    
    if (exportData?.template) {
      types.push('template');
    }
    
    if (exportData?.batchJob) {
      types.push('batch_job');
    }
    
    return types;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Export / Import</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'export'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('export')}
          >
            Export
          </button>
          <button
            className={`flex-1 px-6 py-3 text-sm font-medium ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Export Type Selection */}
              <div>
                <h3 className="text-lg font-medium mb-3">Export Type</h3>
                <div className="grid grid-cols-1 gap-3">
                  {getAvailableExportTypes().map((type) => (
                    <Card
                      key={type}
                      className={`cursor-pointer transition-colors ${
                        exportType === type ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setExportType(type as any)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium capitalize">{type.replace('_', ' ')}</h4>
                            <p className="text-sm text-gray-600">
                              {getExportTypeDescription(type)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="capitalize">
                              {type.replace('_', ' ')}
                            </Badge>
                            {exportType === type && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Export Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Export Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </Button>
                  
                  <Button
                    onClick={handleDownload}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </Button>
                  
                  <Button
                    onClick={handleCopyToClipboard}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {showPreview && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Export Preview</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(false)}
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="p-4">
                      <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                        {previewData}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Import Options */}
              <div>
                <h3 className="text-lg font-medium mb-3">Import Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="cursor-pointer hover:bg-gray-50" onClick={() => fileInputRef.current?.click()}>
                    <CardContent className="p-6 text-center">
                      <Upload className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                      <h4 className="font-medium mb-2">Import from File</h4>
                      <p className="text-sm text-gray-600">
                        Select a JSON file to import configurations, templates, or batch jobs
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileImport}
                        className="hidden"
                      />
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:bg-gray-50" onClick={handleClipboardImport}>
                    <CardContent className="p-6 text-center">
                      <Copy className="w-8 h-8 mx-auto mb-3 text-green-600" />
                      <h4 className="font-medium mb-2">Import from Clipboard</h4>
                      <p className="text-sm text-gray-600">
                        Import configuration data from clipboard
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Import Result */}
              {importResult && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Import Result</h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Success/Error Status */}
                        <div className="flex items-center space-x-2">
                          {importResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`font-medium ${
                            importResult.success ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {importResult.success ? 'Import Successful' : 'Import Failed'}
                          </span>
                        </div>

                        {/* Imported Items */}
                        <div>
                          <h4 className="font-medium mb-2">Imported Items</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="text-center p-2 bg-blue-50 rounded">
                              <div className="text-lg font-bold text-blue-600">
                                {importResult.importedItems.configurations}
                              </div>
                              <div className="text-xs text-blue-600">Configurations</div>
                            </div>
                            <div className="text-center p-2 bg-green-50 rounded">
                              <div className="text-lg font-bold text-green-600">
                                {importResult.importedItems.templates}
                              </div>
                              <div className="text-xs text-green-600">Templates</div>
                            </div>
                            <div className="text-center p-2 bg-purple-50 rounded">
                              <div className="text-lg font-bold text-purple-600">
                                {importResult.importedItems.batchJobs}
                              </div>
                              <div className="text-xs text-purple-600">Batch Jobs</div>
                            </div>
                            <div className="text-center p-2 bg-orange-50 rounded">
                              <div className="text-lg font-bold text-orange-600">
                                {importResult.importedItems.strategies}
                              </div>
                              <div className="text-xs text-orange-600">Strategies</div>
                            </div>
                          </div>
                        </div>

                        {/* Errors */}
                        {importResult.errors.length > 0 && (
                          <div>
                            <h4 className="font-medium text-red-600 mb-2">Errors</h4>
                            <div className="space-y-2">
                              {importResult.errors.map((error, index) => (
                                <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                                  <div className="font-medium text-red-800">{error.message}</div>
                                  {error.item && (
                                    <div className="text-red-600">Item: {error.item}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Warnings */}
                        {importResult.warnings.length > 0 && (
                          <div>
                            <h4 className="font-medium text-yellow-600 mb-2">Warnings</h4>
                            <div className="space-y-2">
                              {importResult.warnings.map((warning, index) => (
                                <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                                  <div className="font-medium text-yellow-800">{warning.message}</div>
                                  {warning.suggestion && (
                                    <div className="text-yellow-600">Suggestion: {warning.suggestion}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Import Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-gray-600">
                      <h4 className="font-medium text-gray-900 mb-1">Import Information</h4>
                      <ul className="space-y-1">
                        <li>• Supported formats: JSON files</li>
                        <li>• Maximum file size: 10MB</li>
                        <li>• Imported items will be assigned new IDs to avoid conflicts</li>
                        <li>• Check the import result for any errors or warnings</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportImportDialog;
