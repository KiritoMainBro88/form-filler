import { Logger } from './Logger';
import { AdvancedScanResult } from '../scanner/AdvancedFormScanner';
import { FormTemplate } from '../templates/FormTemplates';
import { BatchJob } from '../batch/BatchProcessor';

export interface ExportPackage {
  version: string;
  type: 'configuration' | 'template' | 'batch_job' | 'complete';
  metadata: {
    name: string;
    description?: string;
    author?: string;
    createdAt: string;
    exportedAt: string;
    tags?: string[];
  };
  data: {
    scanResult?: AdvancedScanResult;
    template?: FormTemplate;
    batchJob?: BatchJob;
    configurations?: ConfigurationExport[];
    strategies?: StrategyExport[];
  };
}

export interface ConfigurationExport {
  id: string;
  name: string;
  description?: string;
  formUrl: string;
  formTitle: string;
  fillStrategies: Map<string, string>;
  customValues: Map<string, any>;
  executionSettings: {
    runs: number;
    delayBetweenRuns: number;
    headless: boolean;
  };
  createdAt: string;
  lastModified: string;
}

export interface StrategyExport {
  id: string;
  name: string;
  description: string;
  category: string;
  customPatterns?: Map<string, string>;
  userPreferences?: any;
}

export interface ImportResult {
  success: boolean;
  importedItems: {
    configurations: number;
    templates: number;
    batchJobs: number;
    strategies: number;
  };
  errors: ImportError[];
  warnings: ImportWarning[];
}

export interface ImportError {
  type: 'validation' | 'compatibility' | 'duplicate' | 'system';
  message: string;
  item?: string;
  details?: any;
}

export interface ImportWarning {
  type: 'version' | 'deprecated' | 'missing_dependency';
  message: string;
  item?: string;
  suggestion?: string;
}

export class ExportImportManager {
  private logger: Logger;
  private currentVersion = '2.0.0';
  private supportedVersions = ['1.0.0', '1.1.0', '1.2.0', '2.0.0'];

  constructor() {
    this.logger = new Logger();
  }

  // Export Methods

  public exportConfiguration(
    scanResult: AdvancedScanResult,
    fillStrategies: Map<string, string>,
    customValues: Map<string, any>,
    executionSettings: any,
    options?: {
      name?: string;
      description?: string;
      author?: string;
      tags?: string[];
    }
  ): ExportPackage {
    const configuration: ConfigurationExport = {
      id: `config-${Date.now()}`,
      name: options?.name || `${scanResult.formTitle} Configuration`,
      description: options?.description || `Configuration for ${scanResult.formTitle}`,
      formUrl: scanResult.formUrl,
      formTitle: scanResult.formTitle,
      fillStrategies: new Map(fillStrategies),
      customValues: new Map(customValues),
      executionSettings: {
        runs: executionSettings.runs || 1,
        delayBetweenRuns: executionSettings.delayBetweenRuns || 2000,
        headless: executionSettings.headless || true
      },
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    const package_: ExportPackage = {
      version: this.currentVersion,
      type: 'configuration',
      metadata: {
        name: configuration.name,
        description: configuration.description,
        author: options?.author || 'User',
        createdAt: configuration.createdAt,
        exportedAt: new Date().toISOString(),
        tags: options?.tags || []
      },
      data: {
        scanResult,
        configurations: [configuration]
      }
    };

    this.logger.info('Configuration exported', { 
      name: configuration.name,
      formUrl: scanResult.formUrl 
    });

    return package_;
  }

  public exportTemplate(template: FormTemplate): ExportPackage {
    const package_: ExportPackage = {
      version: this.currentVersion,
      type: 'template',
      metadata: {
        name: template.name,
        description: template.description,
        author: template.author,
        createdAt: template.lastUpdated,
        exportedAt: new Date().toISOString(),
        tags: template.tags
      },
      data: {
        template: { ...template }
      }
    };

    this.logger.info('Template exported', { 
      templateId: template.id,
      name: template.name 
    });

    return package_;
  }

  public exportBatchJob(batchJob: BatchJob): ExportPackage {
    const package_: ExportPackage = {
      version: this.currentVersion,
      type: 'batch_job',
      metadata: {
        name: batchJob.name,
        description: batchJob.description,
        author: 'User',
        createdAt: batchJob.createdAt,
        exportedAt: new Date().toISOString(),
        tags: ['batch', 'automation']
      },
      data: {
        batchJob: { ...batchJob }
      }
    };

    this.logger.info('Batch job exported', { 
      jobId: batchJob.id,
      name: batchJob.name 
    });

    return package_;
  }

  public exportComplete(
    configurations: ConfigurationExport[],
    templates: FormTemplate[],
    batchJobs: BatchJob[],
    strategies: StrategyExport[],
    options?: {
      name?: string;
      description?: string;
      author?: string;
      tags?: string[];
    }
  ): ExportPackage {
    const package_: ExportPackage = {
      version: this.currentVersion,
      type: 'complete',
      metadata: {
        name: options?.name || 'Complete Export',
        description: options?.description || 'Complete export of all configurations, templates, and batch jobs',
        author: options?.author || 'User',
        createdAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        tags: options?.tags || ['complete', 'backup']
      },
      data: {
        configurations,
        template: templates[0], // For backward compatibility
        strategies
      }
    };

    this.logger.info('Complete export created', { 
      configurations: configurations.length,
      templates: templates.length,
      batchJobs: batchJobs.length,
      strategies: strategies.length 
    });

    return package_;
  }

  public exportToFile(package_: ExportPackage, filename?: string): string {
    const jsonString = JSON.stringify(package_, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${package_.metadata.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.logger.info('Export file created', { filename: link.download });
    return link.download;
  }

  public exportToClipboard(package_: ExportPackage): Promise<void> {
    const jsonString = JSON.stringify(package_, null, 2);
    return navigator.clipboard.writeText(jsonString).then(() => {
      this.logger.info('Export copied to clipboard', { 
        type: package_.type,
        name: package_.metadata.name 
      });
    });
  }

  // Import Methods

  public async importFromFile(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const package_ = JSON.parse(text) as ExportPackage;
      return this.importPackage(package_);
    } catch (error: any) {
      this.logger.error('Failed to import from file', error);
      return {
        success: false,
        importedItems: { configurations: 0, templates: 0, batchJobs: 0, strategies: 0 },
        errors: [{
          type: 'system',
          message: 'Failed to read or parse file: ' + error.message
        }],
        warnings: []
      };
    }
  }

  public async importFromClipboard(): Promise<ImportResult> {
    try {
      const text = await navigator.clipboard.readText();
      const package_ = JSON.parse(text) as ExportPackage;
      return this.importPackage(package_);
    } catch (error: any) {
      this.logger.error('Failed to import from clipboard', error);
      return {
        success: false,
        importedItems: { configurations: 0, templates: 0, batchJobs: 0, strategies: 0 },
        errors: [{
          type: 'system',
          message: 'Failed to read from clipboard: ' + error.message
        }],
        warnings: []
      };
    }
  }

  public importPackage(package_: ExportPackage): ImportResult {
    const result: ImportResult = {
      success: true,
      importedItems: { configurations: 0, templates: 0, batchJobs: 0, strategies: 0 },
      errors: [],
      warnings: []
    };

    try {
      // Validate package structure
      this.validatePackage(package_, result);

      // Check version compatibility
      this.checkVersionCompatibility(package_, result);

      // Import based on package type
      switch (package_.type) {
        case 'configuration':
          this.importConfiguration(package_, result);
          break;
        case 'template':
          this.importTemplate(package_, result);
          break;
        case 'batch_job':
          this.importBatchJob(package_, result);
          break;
        case 'complete':
          this.importComplete(package_, result);
          break;
        default:
          result.errors.push({
            type: 'validation',
            message: `Unsupported package type: ${package_.type}`
          });
      }

      result.success = result.errors.length === 0;

      this.logger.info('Package imported', { 
        type: package_.type,
        success: result.success,
        importedItems: result.importedItems 
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push({
        type: 'system',
        message: 'Import failed: ' + error.message,
        details: error
      });
    }

    return result;
  }

  private validatePackage(package_: ExportPackage, result: ImportResult): void {
    if (!package_.version) {
      result.errors.push({
        type: 'validation',
        message: 'Package version is required'
      });
    }

    if (!package_.type) {
      result.errors.push({
        type: 'validation',
        message: 'Package type is required'
      });
    }

    if (!package_.metadata || !package_.metadata.name) {
      result.errors.push({
        type: 'validation',
        message: 'Package metadata and name are required'
      });
    }

    if (!package_.data) {
      result.errors.push({
        type: 'validation',
        message: 'Package data is required'
      });
    }
  }

  private checkVersionCompatibility(package_: ExportPackage, result: ImportResult): void {
    if (!this.supportedVersions.includes(package_.version)) {
      result.warnings.push({
        type: 'version',
        message: `Package version ${package_.version} is not officially supported`,
        suggestion: 'Consider updating to a supported version'
      });
    }

    if (package_.version !== this.currentVersion) {
      result.warnings.push({
        type: 'version',
        message: `Package version ${package_.version} differs from current version ${this.currentVersion}`,
        suggestion: 'Some features may not be fully compatible'
      });
    }
  }

  private importConfiguration(package_: ExportPackage, result: ImportResult): void {
    if (!package_.data.configurations || package_.data.configurations.length === 0) {
      result.errors.push({
        type: 'validation',
        message: 'No configurations found in package'
      });
      return;
    }

    package_.data.configurations.forEach(config => {
      try {
        // Validate configuration
        if (!config.formUrl || !config.formTitle) {
          result.errors.push({
            type: 'validation',
            message: 'Configuration missing required fields',
            item: config.name
          });
          return;
        }

        // Check for duplicates (simplified - would need actual storage check)
        // For now, we'll just import with a new ID
        config.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        config.lastModified = new Date().toISOString();

        result.importedItems.configurations++;
        this.logger.info('Configuration imported', { 
          id: config.id,
          name: config.name 
        });

      } catch (error: any) {
        result.errors.push({
          type: 'system',
          message: 'Failed to import configuration: ' + error.message,
          item: config.name,
          details: error
        });
      }
    });
  }

  private importTemplate(package_: ExportPackage, result: ImportResult): void {
    if (!package_.data.template) {
      result.errors.push({
        type: 'validation',
        message: 'No template found in package'
      });
      return;
    }

    try {
      const template = package_.data.template;
      
      // Validate template
      if (!template.id || !template.name || !template.category) {
        result.errors.push({
          type: 'validation',
          message: 'Template missing required fields'
        });
        return;
      }

      // Generate new ID to avoid conflicts
      template.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      template.lastUpdated = new Date().toISOString();

      result.importedItems.templates++;
      this.logger.info('Template imported', { 
        id: template.id,
        name: template.name 
      });

    } catch (error: any) {
      result.errors.push({
        type: 'system',
        message: 'Failed to import template: ' + error.message,
        details: error
      });
    }
  }

  private importBatchJob(package_: ExportPackage, result: ImportResult): void {
    if (!package_.data.batchJob) {
      result.errors.push({
        type: 'validation',
        message: 'No batch job found in package'
      });
      return;
    }

    try {
      const batchJob = package_.data.batchJob;
      
      // Validate batch job
      if (!batchJob.id || !batchJob.name || !batchJob.config) {
        result.errors.push({
          type: 'validation',
          message: 'Batch job missing required fields'
        });
        return;
      }

      // Generate new ID to avoid conflicts
      batchJob.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      batchJob.status = 'pending';
      batchJob.createdAt = new Date().toISOString();
      batchJob.startedAt = undefined;
      batchJob.completedAt = undefined;

      result.importedItems.batchJobs++;
      this.logger.info('Batch job imported', { 
        id: batchJob.id,
        name: batchJob.name 
      });

    } catch (error: any) {
      result.errors.push({
        type: 'system',
        message: 'Failed to import batch job: ' + error.message,
        details: error
      });
    }
  }

  private importComplete(package_: ExportPackage, result: ImportResult): void {
    // Import configurations
    if (package_.data.configurations) {
      package_.data.configurations.forEach(config => {
        try {
          config.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          config.lastModified = new Date().toISOString();
          result.importedItems.configurations++;
        } catch (error: any) {
          result.errors.push({
            type: 'system',
            message: 'Failed to import configuration: ' + error.message,
            item: config.name,
            details: error
          });
        }
      });
    }

    // Import templates
    if (package_.data.template) {
      try {
        package_.data.template.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        package_.data.template.lastUpdated = new Date().toISOString();
        result.importedItems.templates++;
      } catch (error: any) {
        result.errors.push({
          type: 'system',
          message: 'Failed to import template: ' + error.message,
          details: error
        });
      }
    }

    // Import strategies
    if (package_.data.strategies) {
      package_.data.strategies.forEach(strategy => {
        try {
          strategy.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          result.importedItems.strategies++;
        } catch (error: any) {
          result.errors.push({
            type: 'system',
            message: 'Failed to import strategy: ' + error.message,
            item: strategy.name,
            details: error
          });
        }
      });
    }
  }

  // Utility Methods

  public generateShareableLink(package_: ExportPackage): string {
    // In a real implementation, this would upload to a cloud service
    // For now, we'll create a data URL
    const jsonString = JSON.stringify(package_, null, 2);
    const encoded = encodeURIComponent(jsonString);
    return `data:application/json;charset=utf-8,${encoded}`;
  }

  public validateConfiguration(config: ConfigurationExport): ImportError[] {
    const errors: ImportError[] = [];

    if (!config.id) {
      errors.push({
        type: 'validation',
        message: 'Configuration ID is required'
      });
    }

    if (!config.name) {
      errors.push({
        type: 'validation',
        message: 'Configuration name is required'
      });
    }

    if (!config.formUrl) {
      errors.push({
        type: 'validation',
        message: 'Form URL is required'
      });
    }

    if (!config.formTitle) {
      errors.push({
        type: 'validation',
        message: 'Form title is required'
      });
    }

    if (!config.fillStrategies || config.fillStrategies.size === 0) {
      errors.push({
        type: 'validation',
        message: 'Fill strategies are required'
      });
    }

    if (!config.executionSettings) {
      errors.push({
        type: 'validation',
        message: 'Execution settings are required'
      });
    }

    return errors;
  }

  public validateTemplate(template: FormTemplate): ImportError[] {
    const errors: ImportError[] = [];

    if (!template.id) {
      errors.push({
        type: 'validation',
        message: 'Template ID is required'
      });
    }

    if (!template.name) {
      errors.push({
        type: 'validation',
        message: 'Template name is required'
      });
    }

    if (!template.category) {
      errors.push({
        type: 'validation',
        message: 'Template category is required'
      });
    }

    if (!template.config) {
      errors.push({
        type: 'validation',
        message: 'Template configuration is required'
      });
    }

    return errors;
  }

  public getExportPreview(package_: ExportPackage): string {
    const preview = {
      type: package_.type,
      name: package_.metadata.name,
      description: package_.metadata.description,
      version: package_.version,
      items: {
        configurations: package_.data.configurations?.length || 0,
        templates: package_.data.template ? 1 : 0,
        batchJobs: package_.data.batchJob ? 1 : 0,
        strategies: package_.data.strategies?.length || 0
      },
      createdAt: package_.metadata.createdAt,
      exportedAt: package_.metadata.exportedAt
    };

    return JSON.stringify(preview, null, 2);
  }

  public getSupportedFormats(): string[] {
    return ['json'];
  }

  public getMaxFileSize(): number {
    return 10 * 1024 * 1024; // 10MB
  }

  public isFileSupported(filename: string): boolean {
    const extension = filename.toLowerCase().split('.').pop();
    return extension === 'json';
  }
}
