import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { AdvancedFormScanner, AdvancedScanResult } from '../scanner/AdvancedFormScanner';
import { FormFiller } from '../filler/FormFiller';
import { SmartFillStrategies } from '../strategies/SmartFillStrategies';
import { FormTemplates, FormTemplate } from '../templates/FormTemplates';

export interface BatchJob {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Job configuration
  config: {
    forms: BatchFormConfig[];
    executionSettings: {
      maxConcurrent: number;
      delayBetweenForms: number;
      delayBetweenRuns: number;
      retryAttempts: number;
      retryDelay: number;
      headless: boolean;
    };
    notificationSettings: {
      onStart: boolean;
      onProgress: boolean;
      onComplete: boolean;
      onError: boolean;
    };
  };
  
  // Progress tracking
  progress: {
    totalForms: number;
    completedForms: number;
    failedForms: number;
    totalRuns: number;
    completedRuns: number;
    failedRuns: number;
    currentForm?: string;
    currentRun?: number;
    estimatedTimeRemaining?: number;
  };
  
  // Results
  results: {
    successRate: number;
    totalTime: number;
    errors: BatchError[];
    formResults: Map<string, FormResult>;
  };
}

export interface BatchFormConfig {
  formUrl: string;
  formName: string;
  templateId?: string;
  customConfig?: any;
  runs: number;
  enabled: boolean;
}

export interface FormResult {
  formUrl: string;
  formName: string;
  status: 'success' | 'failed' | 'skipped';
  runs: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  errors: string[];
  totalTime: number;
  averageTime: number;
  details: RunDetail[];
}

export interface RunDetail {
  runNumber: number;
  status: 'success' | 'failed' | 'skipped';
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
  screenshot?: string;
}

export interface BatchError {
  type: 'form_scan_error' | 'form_fill_error' | 'template_error' | 'system_error';
  message: string;
  formUrl?: string;
  runNumber?: number;
  timestamp: string;
  details?: any;
}

export interface BatchProgress {
  jobId: string;
  status: BatchJob['status'];
  progress: BatchJob['progress'];
  currentForm?: string;
  currentRun?: number;
  estimatedTimeRemaining?: number;
}

export class BatchProcessor extends EventEmitter {
  private logger: Logger;
  private scanner: AdvancedFormScanner;
  private filler: FormFiller;
  private strategies: SmartFillStrategies;
  private templates: FormTemplates;
  private activeJobs: Map<string, BatchJob> = new Map();
  private jobQueue: BatchJob[] = [];
  private isProcessing = false;
  private maxConcurrentJobs = 3;

  constructor() {
    super();
    this.logger = new Logger();
    this.scanner = new AdvancedFormScanner();
    this.filler = new FormFiller();
    this.strategies = new SmartFillStrategies();
    this.templates = new FormTemplates();
  }

  public async createBatchJob(
    name: string,
    forms: BatchFormConfig[],
    options?: {
      description?: string;
      priority?: BatchJob['priority'];
      maxConcurrent?: number;
      delayBetweenForms?: number;
      delayBetweenRuns?: number;
      retryAttempts?: number;
      retryDelay?: number;
      headless?: boolean;
    }
  ): Promise<BatchJob> {
    const job: BatchJob = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      name,
      description: options?.description,
      status: 'pending',
      priority: options?.priority || 'normal',
      createdAt: new Date().toISOString(),
      config: {
        forms: forms.filter(f => f.enabled),
        executionSettings: {
          maxConcurrent: options?.maxConcurrent || 2,
          delayBetweenForms: options?.delayBetweenForms || 5000,
          delayBetweenRuns: options?.delayBetweenRuns || 2000,
          retryAttempts: options?.retryAttempts || 3,
          retryDelay: options?.retryDelay || 3000,
          headless: options?.headless || true
        },
        notificationSettings: {
          onStart: true,
          onProgress: true,
          onComplete: true,
          onError: true
        }
      },
      progress: {
        totalForms: forms.filter(f => f.enabled).length,
        completedForms: 0,
        failedForms: 0,
        totalRuns: forms.filter(f => f.enabled).reduce((sum, f) => sum + f.runs, 0),
        completedRuns: 0,
        failedRuns: 0
      },
      results: {
        successRate: 0,
        totalTime: 0,
        errors: [],
        formResults: new Map()
      }
    };

    this.activeJobs.set(job.id, job);
    this.jobQueue.push(job);
    
    this.logger.info('Batch job created', { 
      jobId: job.id, 
      name, 
      formCount: job.config.forms.length,
      totalRuns: job.progress.totalRuns 
    });

    this.emit('jobCreated', job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job;
  }

  public getJob(jobId: string): BatchJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  public getAllJobs(): BatchJob[] {
    return Array.from(this.activeJobs.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public async pauseJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== 'running') {
      return false;
    }

    job.status = 'paused';
    this.logger.info('Batch job paused', { jobId });
    this.emit('jobPaused', job);
    return true;
  }

  public async resumeJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status !== 'paused') {
      return false;
    }

    job.status = 'running';
    this.logger.info('Batch job resumed', { jobId });
    this.emit('jobResumed', job);
    return true;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || (job.status !== 'pending' && job.status !== 'running' && job.status !== 'paused')) {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    
    this.logger.info('Batch job cancelled', { jobId });
    this.emit('jobCancelled', job);
    return true;
  }

  public async deleteJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job || job.status === 'running') {
      return false;
    }

    this.activeJobs.delete(jobId);
    this.jobQueue = this.jobQueue.filter(j => j.id !== jobId);
    
    this.logger.info('Batch job deleted', { jobId });
    this.emit('jobDeleted', job);
    return true;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.logger.info('Starting batch processing queue');

    while (this.jobQueue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
      const job = this.jobQueue.shift();
      if (job && job.status === 'pending') {
        job.status = 'running';
        this.activeJobs.set(job.id, job);
        
        this.processJob(job).catch(error => {
          this.logger.error('Job processing failed', { jobId: job.id, error });
          job.status = 'failed';
          this.activeJobs.delete(job.id);
        });
      }
    }

    this.isProcessing = false;
  }

  private async processJob(job: BatchJob): Promise<void> {
    try {
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      
      this.logger.info('Starting batch job', { jobId: job.id, name: job.name });
      this.emit('jobStarted', job);

      const startTime = Date.now();
      
      // Process forms sequentially to avoid overwhelming the system
      for (const formConfig of job.config.forms) {
        if (job.status !== 'running') {
          break;
        }

        await this.processForm(job, formConfig);
        
        // Delay between forms
        if (job.config.executionSettings.delayBetweenForms > 0) {
          await this.delay(job.config.executionSettings.delayBetweenForms);
        }
      }

      // Calculate final results
      job.results.totalTime = Date.now() - startTime;
      job.results.successRate = job.progress.totalRuns > 0 
        ? (job.progress.completedRuns / job.progress.totalRuns) * 100 
        : 0;

      job.status = 'completed';
      job.completedAt = new Date().toISOString();

      this.logger.info('Batch job completed', { 
        jobId: job.id, 
        successRate: job.results.successRate,
        totalTime: job.results.totalTime 
      });
      
      this.emit('jobCompleted', job);
      
    } catch (error: any) {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      
      const batchError: BatchError = {
        type: 'system_error',
        message: error?.message || String(error),
        timestamp: new Date().toISOString(),
        details: error
      };
      
      job.results.errors.push(batchError);
      
      this.logger.error('Batch job failed', { jobId: job.id, error });
      this.emit('jobFailed', job, batchError);
    }
  }

  private async processForm(job: BatchJob, formConfig: BatchFormConfig): Promise<void> {
    const formResult: FormResult = {
      formUrl: formConfig.formUrl,
      formName: formConfig.formName,
      status: 'success',
      runs: {
        total: formConfig.runs,
        successful: 0,
        failed: 0,
        skipped: 0
      },
      errors: [],
      totalTime: 0,
      averageTime: 0,
      details: []
    };

    job.progress.currentForm = formConfig.formName;
    this.emit('jobProgress', this.createProgressUpdate(job));

    try {
      this.logger.info('Processing form', { 
        jobId: job.id, 
        formName: formConfig.formName,
        runs: formConfig.runs 
      });

      // Scan form
      const scanResult = await this.scanner.scanForm(formConfig.formUrl);
      
      // Get template or use default configuration
      let template: FormTemplate | null = null;
      if (formConfig.templateId) {
        template = this.templates.getTemplate(formConfig.templateId);
      } else {
        const matches = this.templates.findMatchingTemplates(
          scanResult.questions, 
          scanResult.formTitle, 
          scanResult.formDescription
        );
        if (matches.length > 0) {
          template = matches[0].template;
        }
      }

      // Process runs
      const formStartTime = Date.now();
      
      for (let runNumber = 1; runNumber <= formConfig.runs; runNumber++) {
        if (job.status === 'cancelled' || job.status === 'paused') {
          formResult.runs.skipped = formConfig.runs - runNumber + 1;
          break;
        }

        job.progress.currentRun = runNumber;
        this.emit('jobProgress', this.createProgressUpdate(job));

        const runDetail = await this.processRun(
          job, 
          formConfig, 
          scanResult, 
          template, 
          runNumber
        );
        
        formResult.details.push(runDetail);
        
        if (runDetail.status === 'success') {
          formResult.runs.successful++;
          job.progress.completedRuns++;
        } else {
          formResult.runs.failed++;
          job.progress.failedRuns++;
          if (runDetail.error) {
            formResult.errors.push(runDetail.error);
          }
        }

        // Delay between runs
        if (runNumber < formConfig.runs && job.config.executionSettings.delayBetweenRuns > 0) {
          await this.delay(job.config.executionSettings.delayBetweenRuns);
        }
      }

      formResult.totalTime = Date.now() - formStartTime;
      formResult.averageTime = formResult.runs.successful > 0 
        ? formResult.totalTime / formResult.runs.successful 
        : 0;

      // Determine form status
      if (formResult.runs.failed > formResult.runs.successful) {
        formResult.status = 'failed';
        job.progress.failedForms++;
      } else {
        job.progress.completedForms++;
      }

      job.results.formResults.set(formConfig.formUrl, formResult);
      
      this.logger.info('Form processing completed', { 
        jobId: job.id, 
        formName: formConfig.formName,
        successful: formResult.runs.successful,
        failed: formResult.runs.failed 
      });

    } catch (error: any) {
      formResult.status = 'failed';
      formResult.errors.push(error?.message || String(error));
      job.progress.failedForms++;
      
      const batchError: BatchError = {
        type: 'form_scan_error',
        message: error?.message || String(error),
        formUrl: formConfig.formUrl,
        timestamp: new Date().toISOString(),
        details: error
      };
      
      job.results.errors.push(batchError);
      
      this.logger.error('Form processing failed', { 
        jobId: job.id, 
        formName: formConfig.formName, 
        error 
      });
    }
  }

  private async processRun(
    job: BatchJob,
    formConfig: BatchFormConfig,
    scanResult: AdvancedScanResult,
    template: FormTemplate | null,
    runNumber: number
  ): Promise<RunDetail> {
    const runDetail: RunDetail = {
      runNumber,
      status: 'success',
      startTime: new Date().toISOString()
    };

    try {
      // Create fill configuration
      const fillConfig = this.createFillConfig(scanResult, template, formConfig.customConfig);
      
      // Execute form filling
      await this.filler.startFilling(
        fillConfig,
        (progress) => {
          // Update job progress
          job.progress.completedRuns = progress.currentRun;
          job.progress.totalRuns = progress.totalRuns;
          this.activeJobs.set(job.id, job);
        }
      );

      runDetail.endTime = new Date().toISOString();
      runDetail.duration = new Date(runDetail.endTime).getTime() - new Date(runDetail.startTime).getTime();
      
      this.logger.info('Run completed successfully', { 
        jobId: job.id, 
        formName: formConfig.formName, 
        runNumber 
      });

    } catch (error: any) {
      runDetail.status = 'failed';
      runDetail.endTime = new Date().toISOString();
      runDetail.duration = new Date(runDetail.endTime).getTime() - new Date(runDetail.startTime).getTime();
      runDetail.error = error?.message || String(error);
      
      this.logger.error('Run failed', { 
        jobId: job.id, 
        formName: formConfig.formName, 
        runNumber, 
        error 
      });
    }

    return runDetail;
  }

  private createFillConfig(
    scanResult: AdvancedScanResult,
    template: FormTemplate | null,
    customConfig?: any
  ): any {
    const config: any = {
      formUrl: scanResult.formUrl,
      formTitle: scanResult.formTitle,
      questions: scanResult.questions,
      fillStrategies: new Map(),
      customValues: new Map(),
      executionSettings: {
        runs: 1,
        delayBetweenRuns: 2000,
        headless: true
      }
    };

    // Apply template configuration if available
    if (template) {
      config.fillStrategies = new Map(template.config.fillStrategies);
      config.customValues = new Map(template.config.customValues);
      config.executionSettings = { ...config.executionSettings, ...template.config.executionSettings };
    }

    // Apply custom configuration if provided
    if (customConfig) {
      if (customConfig.fillStrategies) {
        config.fillStrategies = new Map(customConfig.fillStrategies);
      }
      if (customConfig.customValues) {
        config.customValues = new Map(customConfig.customValues);
      }
      if (customConfig.executionSettings) {
        config.executionSettings = { ...config.executionSettings, ...customConfig.executionSettings };
      }
    }

    // Set default strategies for questions without configuration
    scanResult.questions.forEach(question => {
      if (!config.fillStrategies.has(question.id)) {
        const recommendedStrategy = this.strategies.getRecommendedStrategy(question);
        config.fillStrategies.set(question.id, recommendedStrategy);
      }
    });

    return config;
  }

  private createProgressUpdate(job: BatchJob): BatchProgress {
    const totalRuns = job.progress.totalRuns;
    const completedRuns = job.progress.completedRuns;
    // const progressPercentage = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0;
    
    // Estimate remaining time
    let estimatedTimeRemaining: number | undefined;
    if (job.startedAt && completedRuns > 0) {
      const elapsedTime = Date.now() - new Date(job.startedAt).getTime();
      const averageTimePerRun = elapsedTime / completedRuns;
      const remainingRuns = totalRuns - completedRuns;
      estimatedTimeRemaining = Math.round((averageTimePerRun * remainingRuns) / 1000); // in seconds
    }

    return {
      jobId: job.id,
      status: job.status,
      progress: {
        ...job.progress,
        estimatedTimeRemaining
      },
      currentForm: job.progress.currentForm,
      currentRun: job.progress.currentRun,
      estimatedTimeRemaining
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public utility methods
  public getJobStatistics(): {
    totalJobs: number;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageSuccessRate: number;
    totalRuns: number;
    successfulRuns: number;
  } {
    const jobs = Array.from(this.activeJobs.values());
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'running' || j.status === 'paused').length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const failedJobs = jobs.filter(j => j.status === 'failed').length;
    
    const totalRuns = jobs.reduce((sum, j) => sum + j.progress.totalRuns, 0);
    const successfulRuns = jobs.reduce((sum, j) => sum + j.progress.completedRuns, 0);
    const averageSuccessRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

    return {
      totalJobs,
      activeJobs,
      completedJobs,
      failedJobs,
      averageSuccessRate,
      totalRuns,
      successfulRuns
    };
  }

  public exportJobResults(jobId: string): string {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    return JSON.stringify({
      job: {
        id: job.id,
        name: job.name,
        description: job.description,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        config: job.config,
        progress: job.progress,
        results: job.results
      },
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  public importJobResults(data: string): BatchJob {
    try {
      const imported = JSON.parse(data);
      const job = imported.job as BatchJob;
      
      // Validate job structure
      if (!job.id || !job.name || !job.config) {
        throw new Error('Invalid job data structure');
      }
      
      // Generate new ID to avoid conflicts
      job.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      job.status = 'completed'; // Imported jobs are always completed
      
      this.activeJobs.set(job.id, job);
      
      this.logger.info('Job results imported', { jobId: job.id, name: job.name });
      this.emit('jobImported', job);
      
      return job;
    } catch (error: any) {
      this.logger.error('Failed to import job results', error);
      throw new Error('Failed to import job results: ' + error.message);
    }
  }
}
