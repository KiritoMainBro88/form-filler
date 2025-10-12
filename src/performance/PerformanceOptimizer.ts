import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { FormConfiguration } from '../types';
import { FormTemplate } from '../templates/FormTemplates';
import { BatchJob } from '../batch/BatchProcessor';
import { ScheduledTask } from '../scheduling/Scheduler';

export interface PerformanceMetrics {
  scanning: {
    averageScanTime: number;
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
  filling: {
    averageFillTime: number;
    totalFills: number;
    successfulFills: number;
    failedFills: number;
    averageFormSize: number;
    memoryUsage: number;
  };
  batch: {
    averageJobTime: number;
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageJobSize: number;
    concurrentJobs: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    uptime: number;
  };
}

export interface OptimizationConfig {
  scanning: {
    enableCaching: boolean;
    cacheSize: number; // MB
    cacheExpiry: number; // minutes
    parallelScans: number;
    timeout: number; // milliseconds
    retryAttempts: number;
    compression: boolean;
  };
  filling: {
    enableCaching: boolean;
    cacheSize: number; // MB
    parallelFills: number;
    timeout: number; // milliseconds
    retryAttempts: number;
    batchSize: number;
    delayBetweenFills: number; // milliseconds
  };
  batch: {
    maxConcurrentJobs: number;
    jobTimeout: number; // milliseconds
    retryAttempts: number;
    memoryLimit: number; // MB
    cpuLimit: number; // percentage
  };
  system: {
    enableMonitoring: boolean;
    monitoringInterval: number; // milliseconds
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableProfiling: boolean;
    profilingThreshold: number; // milliseconds
  };
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
  size: number;
  hits: number;
  lastAccessed: number;
}

export interface PerformanceProfile {
  id: string;
  name: string;
  operation: 'scan' | 'fill' | 'batch' | 'system';
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  metadata: {
    formUrl?: string;
    formSize?: number;
    questionCount?: number;
    strategyCount?: number;
    batchSize?: number;
  };
}

export interface OptimizationRecommendation {
  id: string;
  type: 'performance' | 'memory' | 'network' | 'cache' | 'concurrency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  implementation: string;
  estimatedImprovement: number; // percentage
  metadata: {
    createdAt: string;
    appliedAt?: string;
    appliedBy?: string;
    status: 'pending' | 'applied' | 'rejected' | 'expired';
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'memory' | 'error' | 'timeout';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata: {
    operation?: string;
    formUrl?: string;
    batchJobId?: string;
    executionId?: string;
  };
}

export class PerformanceOptimizer extends EventEmitter {
  private logger: Logger;
  private metrics: PerformanceMetrics;
  private config: OptimizationConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private profiles: Map<string, PerformanceProfile> = new Map();
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    this.logger = new Logger();
    this.metrics = this.initializeMetrics();
    this.config = this.getDefaultConfig();
    this.startMonitoring();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      scanning: {
        averageScanTime: 0,
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        cacheHitRate: 0,
        memoryUsage: 0
      },
      filling: {
        averageFillTime: 0,
        totalFills: 0,
        successfulFills: 0,
        failedFills: 0,
        averageFormSize: 0,
        memoryUsage: 0
      },
      batch: {
        averageJobTime: 0,
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageJobSize: 0,
        concurrentJobs: 0
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        uptime: 0
      }
    };
  }

  private getDefaultConfig(): OptimizationConfig {
    return {
      scanning: {
        enableCaching: true,
        cacheSize: 100, // 100 MB
        cacheExpiry: 60, // 60 minutes
        parallelScans: 3,
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        compression: true
      },
      filling: {
        enableCaching: true,
        cacheSize: 50, // 50 MB
        parallelFills: 5,
        timeout: 60000, // 60 seconds
        retryAttempts: 3,
        batchSize: 10,
        delayBetweenFills: 1000 // 1 second
      },
      batch: {
        maxConcurrentJobs: 3,
        jobTimeout: 300000, // 5 minutes
        retryAttempts: 2,
        memoryLimit: 512, // 512 MB
        cpuLimit: 80 // 80%
      },
      system: {
        enableMonitoring: true,
        monitoringInterval: 5000, // 5 seconds
        logLevel: 'info',
        enableProfiling: true,
        profilingThreshold: 1000 // 1 second
      }
    };
  }

  // Performance Monitoring

  public startMonitoring(): void {
    if (this.isMonitoring || !this.config.system.enableMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.checkPerformanceThresholds();
      this.cleanupCache();
    }, this.config.system.monitoringInterval);

    this.logger.info('Performance monitoring started');
    this.emit('monitoring_started');
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.logger.info('Performance monitoring stopped');
    this.emit('monitoring_stopped');
  }

  private updateSystemMetrics(): void {
    try {
      // Update system metrics
      this.metrics.system.cpuUsage = this.getCPUUsage();
      this.metrics.system.memoryUsage = this.getMemoryUsage();
      this.metrics.system.diskUsage = this.getDiskUsage();
      this.metrics.system.networkLatency = this.getNetworkLatency();
      this.metrics.system.uptime = Date.now() - this.getStartTime();

      // Update cache hit rate
      this.updateCacheHitRate();

      this.emit('metrics_updated', this.metrics);
    } catch (error: any) {
      this.logger.error('Failed to update system metrics', error);
    }
  }

  private getCPUUsage(): number {
    // This would be implemented with actual CPU monitoring
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  private getMemoryUsage(): number {
    // This would be implemented with actual memory monitoring
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  private getDiskUsage(): number {
    // This would be implemented with actual disk monitoring
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  private getNetworkLatency(): number {
    // This would be implemented with actual network monitoring
    // For now, return a placeholder value
    return Math.random() * 100;
  }

  private getStartTime(): number {
    // This would be the actual application start time
    return Date.now() - 3600000; // 1 hour ago
  }

  private updateCacheHitRate(): void {
    const totalCacheEntries = this.cache.size;
    if (totalCacheEntries === 0) {
      this.metrics.scanning.cacheHitRate = 0;
      return;
    }

    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const totalAccesses = totalHits + totalCacheEntries; // Simplified calculation
    this.metrics.scanning.cacheHitRate = totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0;
  }

  private checkPerformanceThresholds(): void {
    // Check CPU usage
    if (this.metrics.system.cpuUsage > 90) {
      this.createAlert('cpu', 'critical', 'High CPU Usage', 
        `CPU usage is at ${this.metrics.system.cpuUsage.toFixed(1)}%`, 90, this.metrics.system.cpuUsage);
    }

    // Check memory usage
    if (this.metrics.system.memoryUsage > 85) {
      this.createAlert('memory', 'error', 'High Memory Usage', 
        `Memory usage is at ${this.metrics.system.memoryUsage.toFixed(1)}%`, 85, this.metrics.system.memoryUsage);
    }

    // Check scan performance
    if (this.metrics.scanning.averageScanTime > 10000) {
      this.createAlert('performance', 'warning', 'Slow Scan Performance', 
        `Average scan time is ${this.metrics.scanning.averageScanTime.toFixed(0)}ms`, 10000, this.metrics.scanning.averageScanTime);
    }

    // Check fill performance
    if (this.metrics.filling.averageFillTime > 30000) {
      this.createAlert('performance', 'warning', 'Slow Fill Performance', 
        `Average fill time is ${this.metrics.filling.averageFillTime.toFixed(0)}ms`, 30000, this.metrics.filling.averageFillTime);
    }
  }

  private createAlert(type: string, severity: 'info' | 'warning' | 'error' | 'critical', title: string, message: string, threshold: number, currentValue: number): void {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      type: type as any,
      severity,
      title,
      message,
      threshold,
      currentValue,
      timestamp: Date.now(),
      resolved: false,
      metadata: {}
    };

    this.alerts.set(alertId, alert);
    this.logger.warn('Performance alert created', { alertId, type, severity, title });
    this.emit('alert_created', alert);
  }

  // Caching System

  public setCache(key: string, data: any, expiry?: number): void {
    if (!this.config.scanning.enableCaching) {
      return;
    }

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiry: expiry || (Date.now() + this.config.scanning.cacheExpiry * 60 * 1000),
      size: JSON.stringify(data).length,
      hits: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.emit('cache_set', { key, size: entry.size });
  }

  public getCache(key: string): any {
    if (!this.config.scanning.enableCaching) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);

    this.emit('cache_hit', { key, hits: entry.hits });
    return entry.data;
  }

  public clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
    this.emit('cache_cleared');
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxSize = this.config.scanning.cacheSize * 1024 * 1024; // Convert MB to bytes
    let currentSize = 0;

    // Calculate current cache size
    for (const entry of this.cache.values()) {
      currentSize += entry.size;
    }

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        currentSize -= entry.size;
      }
    }

    // Remove least recently used entries if cache is too large
    if (currentSize > maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      for (const [key, entry] of entries) {
        if (currentSize <= maxSize * 0.8) { // Keep cache at 80% of max size
          break;
        }
        this.cache.delete(key);
        currentSize -= entry.size;
      }
    }
  }

  // Performance Profiling

  public startProfile(operation: string, metadata?: any): string {
    if (!this.config.system.enableProfiling) {
      return '';
    }

    const profileId = `profile-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const profile: PerformanceProfile = {
      id: profileId,
      name: operation,
      operation: this.getOperationType(operation),
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCPUUsage(),
      networkRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      metadata: metadata || {}
    };

    this.profiles.set(profileId, profile);
    this.emit('profile_started', profile);
    return profileId;
  }

  public endProfile(profileId: string): PerformanceProfile | null {
    if (!profileId || !this.config.system.enableProfiling) {
      return null;
    }

    const profile = this.profiles.get(profileId);
    if (!profile) {
      return null;
    }

    profile.endTime = Date.now();
    profile.duration = profile.endTime - profile.startTime;
    profile.memoryUsage = this.getMemoryUsage();
    profile.cpuUsage = this.getCPUUsage();

    this.profiles.set(profileId, profile);
    this.emit('profile_completed', profile);

    // Check if profile exceeds threshold
    if (profile.duration > this.config.system.profilingThreshold) {
      this.logger.warn('Slow operation detected', { 
        operation: profile.name, 
        duration: profile.duration,
        threshold: this.config.system.profilingThreshold
      });
    }

    return profile;
  }

  private getOperationType(operation: string): 'scan' | 'fill' | 'batch' | 'system' {
    if (operation.includes('scan')) return 'scan';
    if (operation.includes('fill')) return 'fill';
    if (operation.includes('batch')) return 'batch';
    return 'system';
  }

  // Performance Optimization

  public optimizeScanning(formUrl: string): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check if form is already cached
    const cachedData = this.getCache(`scan:${formUrl}`);
    if (cachedData) {
      recommendations.push({
        id: `opt-${Date.now()}-1`,
        type: 'cache',
        priority: 'medium',
        title: 'Use Cached Scan Data',
        description: 'Form scan data is already cached, use cached version for faster performance',
        impact: 'Reduce scan time by 80-90%',
        effort: 'low',
        implementation: 'Use cached data instead of re-scanning',
        estimatedImprovement: 85,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    // Check parallel scanning capability
    if (this.metrics.scanning.totalScans > 10 && this.config.scanning.parallelScans < 5) {
      recommendations.push({
        id: `opt-${Date.now()}-2`,
        type: 'concurrency',
        priority: 'high',
        title: 'Increase Parallel Scans',
        description: 'Increase parallel scanning capacity to handle multiple forms simultaneously',
        impact: 'Improve throughput by 2-3x',
        effort: 'medium',
        implementation: 'Increase parallelScans configuration to 5-8',
        estimatedImprovement: 200,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    // Check cache hit rate
    if (this.metrics.scanning.cacheHitRate < 50) {
      recommendations.push({
        id: `opt-${Date.now()}-3`,
        type: 'cache',
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: 'Cache hit rate is low, consider increasing cache size or expiry time',
        impact: 'Reduce redundant scans by 30-50%',
        effort: 'low',
        implementation: 'Increase cache size or expiry time',
        estimatedImprovement: 40,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    return recommendations;
  }

  public optimizeFilling(formConfig: FormConfiguration): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check form complexity
    const questionCount = formConfig.questions?.length || 0;
    if (questionCount > 20) {
      recommendations.push({
        id: `opt-${Date.now()}-4`,
        type: 'performance',
        priority: 'high',
        title: 'Optimize Large Form Filling',
        description: 'Form has many questions, consider batching or parallel processing',
        impact: 'Reduce fill time by 40-60%',
        effort: 'medium',
        implementation: 'Implement question batching or parallel field filling',
        estimatedImprovement: 50,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    // Check strategy complexity
    const strategyCount = Object.keys(formConfig.fillStrategies || {}).length;
    if (strategyCount > 10) {
      recommendations.push({
        id: `opt-${Date.now()}-5`,
        type: 'performance',
        priority: 'medium',
        title: 'Simplify Fill Strategies',
        description: 'Too many different fill strategies, consider consolidating similar ones',
        impact: 'Reduce processing overhead by 20-30%',
        effort: 'low',
        implementation: 'Merge similar strategies or use default strategies',
        estimatedImprovement: 25,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    return recommendations;
  }

  public optimizeBatchProcessing(batchJob: BatchJob): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check batch size
    if (batchJob.runs > 100) {
      recommendations.push({
        id: `opt-${Date.now()}-6`,
        type: 'performance',
        priority: 'high',
        title: 'Optimize Large Batch Job',
        description: 'Batch job has many runs, consider splitting into smaller batches',
        impact: 'Improve reliability and reduce memory usage',
        effort: 'medium',
        implementation: 'Split batch into smaller chunks of 50-100 runs',
        estimatedImprovement: 30,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    // Check concurrent jobs
    if (this.metrics.batch.concurrentJobs >= this.config.batch.maxConcurrentJobs) {
      recommendations.push({
        id: `opt-${Date.now()}-7`,
        type: 'concurrency',
        priority: 'medium',
        title: 'Increase Concurrent Job Capacity',
        description: 'Maximum concurrent jobs reached, consider increasing capacity',
        impact: 'Improve batch processing throughput',
        effort: 'low',
        implementation: 'Increase maxConcurrentJobs configuration',
        estimatedImprovement: 50,
        metadata: {
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
    }

    return recommendations;
  }

  // Metrics Tracking

  public recordScanMetrics(success: boolean, duration: number, formSize: number): void {
    this.metrics.scanning.totalScans++;
    if (success) {
      this.metrics.scanning.successfulScans++;
    } else {
      this.metrics.scanning.failedScans++;
    }

    // Update average scan time
    const totalTime = this.metrics.scanning.averageScanTime * (this.metrics.scanning.totalScans - 1) + duration;
    this.metrics.scanning.averageScanTime = totalTime / this.metrics.scanning.totalScans;

    this.emit('scan_metrics_recorded', { success, duration, formSize });
  }

  public recordFillMetrics(success: boolean, duration: number, formSize: number): void {
    this.metrics.filling.totalFills++;
    if (success) {
      this.metrics.filling.successfulFills++;
    } else {
      this.metrics.filling.failedFills++;
    }

    // Update average fill time
    const totalTime = this.metrics.filling.averageFillTime * (this.metrics.filling.totalFills - 1) + duration;
    this.metrics.filling.averageFillTime = totalTime / this.metrics.filling.totalFills;

    // Update average form size
    const totalSize = this.metrics.filling.averageFormSize * (this.metrics.filling.totalFills - 1) + formSize;
    this.metrics.filling.averageFormSize = totalSize / this.metrics.filling.totalFills;

    this.emit('fill_metrics_recorded', { success, duration, formSize });
  }

  public recordBatchMetrics(success: boolean, duration: number, jobSize: number): void {
    this.metrics.batch.totalJobs++;
    if (success) {
      this.metrics.batch.completedJobs++;
    } else {
      this.metrics.batch.failedJobs++;
    }

    // Update average job time
    const totalTime = this.metrics.batch.averageJobTime * (this.metrics.batch.totalJobs - 1) + duration;
    this.metrics.batch.averageJobTime = totalTime / this.metrics.batch.totalJobs;

    // Update average job size
    const totalSize = this.metrics.batch.averageJobSize * (this.metrics.batch.totalJobs - 1) + jobSize;
    this.metrics.batch.averageJobSize = totalSize / this.metrics.batch.totalJobs;

    this.emit('batch_metrics_recorded', { success, duration, jobSize });
  }

  // Configuration Management

  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Performance optimization config updated');
    this.emit('config_updated', this.config);
  }

  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  // Analytics and Reporting

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getRecommendations(): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  public getAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  public getProfiles(limit: number = 100): PerformanceProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  public applyRecommendation(recommendationId: string): boolean {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) {
      return false;
    }

    // Apply the recommendation based on type
    switch (recommendation.type) {
      case 'cache':
        if (recommendation.title.includes('Increase Parallel Scans')) {
          this.config.scanning.parallelScans = Math.min(this.config.scanning.parallelScans + 2, 8);
        } else if (recommendation.title.includes('Improve Cache Hit Rate')) {
          this.config.scanning.cacheSize = Math.min(this.config.scanning.cacheSize + 50, 500);
        }
        break;
      case 'concurrency':
        if (recommendation.title.includes('Increase Concurrent Job Capacity')) {
          this.config.batch.maxConcurrentJobs = Math.min(this.config.batch.maxConcurrentJobs + 1, 10);
        }
        break;
      case 'performance':
        // Performance optimizations would be implemented based on specific recommendations
        break;
    }

    recommendation.metadata.status = 'applied';
    recommendation.metadata.appliedAt = new Date().toISOString();
    recommendation.metadata.appliedBy = 'system';

    this.recommendations.set(recommendationId, recommendation);
    this.logger.info('Recommendation applied', { recommendationId, title: recommendation.title });
    this.emit('recommendation_applied', recommendation);

    return true;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();
    this.alerts.set(alertId, alert);

    this.logger.info('Alert resolved', { alertId, title: alert.title });
    this.emit('alert_resolved', alert);

    return true;
  }

  // Export/Import

  public exportPerformanceData(): string {
    const data = {
      metrics: this.metrics,
      config: this.config,
      recommendations: Array.from(this.recommendations.values()),
      alerts: Array.from(this.alerts.values()),
      profiles: Array.from(this.profiles.values()).slice(-1000) // Last 1000 profiles
    };

    return JSON.stringify(data, null, 2);
  }

  public importPerformanceData(data: string): boolean {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.metrics) {
        this.metrics = parsedData.metrics;
      }

      if (parsedData.config) {
        this.config = parsedData.config;
      }

      if (parsedData.recommendations) {
        for (const recommendation of parsedData.recommendations) {
          this.recommendations.set(recommendation.id, recommendation);
        }
      }

      if (parsedData.alerts) {
        for (const alert of parsedData.alerts) {
          this.alerts.set(alert.id, alert);
        }
      }

      if (parsedData.profiles) {
        for (const profile of parsedData.profiles) {
          this.profiles.set(profile.id, profile);
        }
      }

      this.logger.info('Performance data imported successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import performance data', error);
      return false;
    }
  }
}
