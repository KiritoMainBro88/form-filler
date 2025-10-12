import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { AdvancedScanResult } from '../scanner/AdvancedFormScanner';
import { BatchProcessor, BatchJob } from '../batch/BatchProcessor';
import { FormFiller } from '../filler/FormFiller';

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
  
  // Schedule configuration
  schedule: {
    type: 'once' | 'interval' | 'cron' | 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate?: string;
    timezone: string;
    
    // For interval schedules
    interval?: {
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    };
    
    // For cron schedules
    cronExpression?: string;
    
    // For recurring schedules
    recurring?: {
      daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
      daysOfMonth?: number[]; // 1-31
      months?: number[]; // 1-12
      time: string; // HH:MM format
    };
  };
  
  // Task configuration
  task: {
    type: 'form_fill' | 'batch_job';
    formUrl?: string;
    batchJobId?: string;
    fillConfig?: any;
    executionSettings?: {
      headless: boolean;
      delayBetweenRuns: number;
      retryAttempts: number;
    };
  };
  
  // Execution tracking
  execution: {
    lastRun?: string;
    nextRun?: string;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    consecutiveFailures: number;
    maxConsecutiveFailures: number;
  };
  
  // Metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    tags: string[];
  };
}

export interface ScheduleEvent {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'task_skipped' | 'schedule_updated';
  taskId: string;
  timestamp: string;
  data?: any;
}

export interface ScheduleStats {
  totalTasks: number;
  activeTasks: number;
  pausedTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  nextExecution?: string;
}

export class Scheduler extends EventEmitter {
  private logger: Logger;
  private tasks: Map<string, ScheduledTask> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private schedulerInterval: NodeJS.Timeout | null = null;
  private batchProcessor: BatchProcessor;
  private formFiller: FormFiller;

  constructor(batchProcessor: BatchProcessor, formFiller: FormFiller) {
    super();
    this.logger = new Logger();
    this.batchProcessor = batchProcessor;
    this.formFiller = formFiller;
  }

  public start(): void {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Scheduler started');

    // Schedule all active tasks
    for (const task of this.tasks.values()) {
      if (task.status === 'active') {
        this.scheduleTask(task);
      }
    }

    // Start the main scheduler loop
    this.startSchedulerLoop();
  }

  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    // Clear scheduler interval
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    // Clear all timers
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer);
    }
    this.activeTimers.clear();

    this.logger.info('Scheduler stopped');
  }

  public createTask(taskConfig: Omit<ScheduledTask, 'id' | 'status' | 'execution' | 'metadata'>): ScheduledTask {
    const task: ScheduledTask = {
      ...taskConfig,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      status: 'active',
      execution: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        consecutiveFailures: 0,
        maxConsecutiveFailures: 3
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'User',
        tags: []
      }
    };

    // Calculate next run time
    task.execution.nextRun = this.calculateNextRun(task);

    this.tasks.set(task.id, task);
    
    if (this.isRunning && task.status === 'active') {
      this.scheduleTask(task);
    }

    this.logger.info('Scheduled task created', { taskId: task.id, name: task.name });
    this.emit('task_created', task);

    return task;
  }

  public updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    const updatedTask = {
      ...task,
      ...updates,
      metadata: {
        ...task.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    // Recalculate next run time if schedule changed
    if (updates.schedule) {
      updatedTask.execution.nextRun = this.calculateNextRun(updatedTask);
    }

    this.tasks.set(taskId, updatedTask);

    // Reschedule if task is active
    if (this.isRunning && updatedTask.status === 'active') {
      this.cancelTask(taskId);
      this.scheduleTask(updatedTask);
    }

    this.logger.info('Scheduled task updated', { taskId, name: updatedTask.name });
    this.emit('task_updated', updatedTask);

    return true;
  }

  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'active') {
      return false;
    }

    task.status = 'paused';
    task.metadata.updatedAt = new Date().toISOString();
    
    this.cancelTask(taskId);
    this.tasks.set(taskId, task);

    this.logger.info('Scheduled task paused', { taskId, name: task.name });
    this.emit('task_paused', task);

    return true;
  }

  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') {
      return false;
    }

    task.status = 'active';
    task.metadata.updatedAt = new Date().toISOString();
    task.execution.nextRun = this.calculateNextRun(task);
    
    this.tasks.set(taskId, task);

    if (this.isRunning) {
      this.scheduleTask(task);
    }

    this.logger.info('Scheduled task resumed', { taskId, name: task.name });
    this.emit('task_resumed', task);

    return true;
  }

  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Clear timer if exists
    const timer = this.activeTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(taskId);
    }

    task.status = 'cancelled';
    task.metadata.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);

    this.logger.info('Scheduled task cancelled', { taskId, name: task.name });
    this.emit('task_cancelled', task);

    return true;
  }

  public deleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    this.cancelTask(taskId);
    this.tasks.delete(taskId);

    this.logger.info('Scheduled task deleted', { taskId, name: task.name });
    this.emit('task_deleted', task);

    return true;
  }

  public getTask(taskId: string): ScheduledTask | null {
    return this.tasks.get(taskId) || null;
  }

  public getAllTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => 
      new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
    );
  }

  public getActiveTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(task => task.status === 'active');
  }

  public getUpcomingTasks(limit: number = 10): ScheduledTask[] {
    return Array.from(this.tasks.values())
      .filter(task => task.status === 'active' && task.execution.nextRun)
      .sort((a, b) => new Date(a.execution.nextRun!).getTime() - new Date(b.execution.nextRun!).getTime())
      .slice(0, limit);
  }

  public getStats(): ScheduleStats {
    const tasks = Array.from(this.tasks.values());
    
    const totalTasks = tasks.length;
    const activeTasks = tasks.filter(t => t.status === 'active').length;
    const pausedTasks = tasks.filter(t => t.status === 'paused').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    
    const totalExecutions = tasks.reduce((sum, t) => sum + t.execution.totalRuns, 0);
    const successfulExecutions = tasks.reduce((sum, t) => sum + t.execution.successfulRuns, 0);
    const failedExecutions = tasks.reduce((sum, t) => sum + t.execution.failedRuns, 0);
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
    
    const nextExecution = this.getUpcomingTasks(1)[0]?.execution.nextRun;

    return {
      totalTasks,
      activeTasks,
      pausedTasks,
      completedTasks,
      failedTasks,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate,
      nextExecution
    };
  }

  private startSchedulerLoop(): void {
    const checkInterval = 60000; // Check every minute
    
    this.schedulerInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      this.checkScheduledTasks();
    }, checkInterval);
  }

  private checkScheduledTasks(): void {
    const now = new Date();
    
    for (const task of this.tasks.values()) {
      if (task.status !== 'active' || !task.execution.nextRun) continue;
      
      const nextRun = new Date(task.execution.nextRun);
      
      if (now >= nextRun) {
        this.executeTask(task);
      }
    }
  }

  private scheduleTask(task: ScheduledTask): void {
    if (!task.execution.nextRun) {
      task.execution.nextRun = this.calculateNextRun(task);
    }

    const nextRun = new Date(task.execution.nextRun);
    const now = new Date();
    const delay = nextRun.getTime() - now.getTime();

    if (delay > 0) {
      const timer = setTimeout(() => {
        this.executeTask(task);
      }, delay);

      this.activeTimers.set(task.id, timer);
      
      this.logger.info('Task scheduled', { 
        taskId: task.id, 
        name: task.name,
        nextRun: task.execution.nextRun 
      });
    } else {
      // Execute immediately if time has passed
      this.executeTask(task);
    }
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    this.logger.info('Executing scheduled task', { taskId: task.id, name: task.name });
    
    const event: ScheduleEvent = {
      type: 'task_started',
      taskId: task.id,
      timestamp: new Date().toISOString(),
      data: { taskName: task.name }
    };
    
    this.emit('task_started', event);

    try {
      task.execution.lastRun = new Date().toISOString();
      task.execution.totalRuns++;

      let success = false;

      if (task.task.type === 'form_fill' && task.task.formUrl) {
        success = await this.executeFormFillTask(task);
      } else if (task.task.type === 'batch_job' && task.task.batchJobId) {
        success = await this.executeBatchJobTask(task);
      }

      if (success) {
        task.execution.successfulRuns++;
        task.execution.consecutiveFailures = 0;
        
        const event: ScheduleEvent = {
          type: 'task_completed',
          taskId: task.id,
          timestamp: new Date().toISOString(),
          data: { taskName: task.name }
        };
        this.emit('task_completed', event);
      } else {
        task.execution.failedRuns++;
        task.execution.consecutiveFailures++;
        
        const event: ScheduleEvent = {
          type: 'task_failed',
          taskId: task.id,
          timestamp: new Date().toISOString(),
          data: { taskName: task.name }
        };
        this.emit('task_failed', event);

        // Check if task should be marked as failed
        if (task.execution.consecutiveFailures >= task.execution.maxConsecutiveFailures) {
          task.status = 'failed';
          this.logger.error('Task marked as failed due to consecutive failures', { 
            taskId: task.id, 
            consecutiveFailures: task.execution.consecutiveFailures 
          });
        }
      }

      // Calculate next run time
      task.execution.nextRun = this.calculateNextRun(task);
      
      // Check if task has reached end date
      if (task.schedule.endDate && new Date() >= new Date(task.schedule.endDate)) {
        task.status = 'completed';
        this.logger.info('Task completed due to end date reached', { taskId: task.id });
      }

      this.tasks.set(task.id, task);

      // Schedule next execution if task is still active
      if (task.status === 'active' && task.execution.nextRun) {
        this.scheduleTask(task);
      }

    } catch (error: any) {
      this.logger.error('Task execution failed', { taskId: task.id, error });
      
      task.execution.failedRuns++;
      task.execution.consecutiveFailures++;
      
      const event: ScheduleEvent = {
        type: 'task_failed',
        taskId: task.id,
        timestamp: new Date().toISOString(),
        data: { taskName: task.name, error: error.message }
      };
      this.emit('task_failed', event);
    }
  }

  private async executeFormFillTask(task: ScheduledTask): Promise<boolean> {
    try {
      if (!task.task.formUrl || !task.task.fillConfig) {
        throw new Error('Form URL or fill configuration missing');
      }

      await this.formFiller.fillForm(
        task.task.formUrl,
        task.task.fillConfig,
        {
          headless: task.task.executionSettings?.headless || true,
          takeScreenshot: true,
          logLevel: 'info'
        }
      );

      return true;
    } catch (error: any) {
      this.logger.error('Form fill task execution failed', { taskId: task.id, error });
      return false;
    }
  }

  private async executeBatchJobTask(task: ScheduledTask): Promise<boolean> {
    try {
      if (!task.task.batchJobId) {
        throw new Error('Batch job ID missing');
      }

      const batchJob = this.batchProcessor.getJob(task.task.batchJobId);
      if (!batchJob) {
        throw new Error('Batch job not found');
      }

      // Start the batch job
      await this.batchProcessor.processJob(batchJob);
      
      return batchJob.status === 'completed';
    } catch (error: any) {
      this.logger.error('Batch job task execution failed', { taskId: task.id, error });
      return false;
    }
  }

  private calculateNextRun(task: ScheduledTask): string | null {
    const now = new Date();
    const startDate = new Date(task.schedule.startDate);
    
    // If start date is in the future, return start date
    if (startDate > now) {
      return startDate.toISOString();
    }

    switch (task.schedule.type) {
      case 'once':
        return null; // One-time task, no next run
        
      case 'interval':
        if (!task.schedule.interval) return null;
        
        const intervalMs = this.getIntervalMs(task.schedule.interval);
        const lastRun = task.execution.lastRun ? new Date(task.execution.lastRun) : startDate;
        const nextRun = new Date(lastRun.getTime() + intervalMs);
        
        return nextRun.toISOString();
        
      case 'daily':
        return this.calculateDailyNextRun(task, now);
        
      case 'weekly':
        return this.calculateWeeklyNextRun(task, now);
        
      case 'monthly':
        return this.calculateMonthlyNextRun(task, now);
        
      case 'cron':
        return this.calculateCronNextRun(task, now);
        
      default:
        return null;
    }
  }

  private getIntervalMs(interval: { value: number; unit: string }): number {
    const { value, unit } = interval;
    
    switch (unit) {
      case 'minutes':
        return value * 60 * 1000;
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      case 'weeks':
        return value * 7 * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  private calculateDailyNextRun(task: ScheduledTask, now: Date): string | null {
    if (!task.schedule.recurring?.time) return null;
    
    const [hours, minutes] = task.schedule.recurring.time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun.toISOString();
  }

  private calculateWeeklyNextRun(task: ScheduledTask, now: Date): string | null {
    if (!task.schedule.recurring?.daysOfWeek || !task.schedule.recurring?.time) return null;
    
    const [hours, minutes] = task.schedule.recurring.time.split(':').map(Number);
    const currentDay = now.getDay();
    
    // Find next occurrence
    for (let i = 0; i < 7; i++) {
      const checkDay = (currentDay + i) % 7;
      if (task.schedule.recurring.daysOfWeek.includes(checkDay)) {
        const nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + i);
        nextRun.setHours(hours, minutes, 0, 0);
        
        if (nextRun > now) {
          return nextRun.toISOString();
        }
      }
    }
    
    return null;
  }

  private calculateMonthlyNextRun(task: ScheduledTask, now: Date): string | null {
    if (!task.schedule.recurring?.daysOfMonth || !task.schedule.recurring?.time) return null;
    
    const [hours, minutes] = task.schedule.recurring.time.split(':').map(Number);
    const currentDay = now.getDate();
    
    // Find next occurrence this month
    for (const day of task.schedule.recurring.daysOfMonth) {
      if (day >= currentDay) {
        const nextRun = new Date(now);
        nextRun.setDate(day);
        nextRun.setHours(hours, minutes, 0, 0);
        
        if (nextRun > now) {
          return nextRun.toISOString();
        }
      }
    }
    
    // Find next occurrence next month
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    
    for (const day of task.schedule.recurring.daysOfMonth) {
      const nextRun = new Date(nextMonth);
      nextRun.setDate(day);
      nextRun.setHours(hours, minutes, 0, 0);
      
      return nextRun.toISOString();
    }
    
    return null;
  }

  private calculateCronNextRun(task: ScheduledTask, now: Date): string | null {
    // Simplified cron calculation - in a real implementation, you'd use a cron parser
    if (!task.schedule.cronExpression) return null;
    
    // For now, return a placeholder
    const nextRun = new Date(now);
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun.toISOString();
  }

  private cancelTask(taskId: string): void {
    const timer = this.activeTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(taskId);
    }
  }

  // Utility methods

  public exportTasks(): string {
    const tasks = Array.from(this.tasks.values());
    return JSON.stringify(tasks, null, 2);
  }

  public importTasks(tasksData: string): boolean {
    try {
      const tasks = JSON.parse(tasksData) as ScheduledTask[];
      
      for (const task of tasks) {
        // Generate new ID to avoid conflicts
        task.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        task.metadata.updatedAt = new Date().toISOString();
        task.execution.nextRun = this.calculateNextRun(task);
        
        this.tasks.set(task.id, task);
        
        if (this.isRunning && task.status === 'active') {
          this.scheduleTask(task);
        }
      }

      this.logger.info('Scheduled tasks imported', { count: tasks.length });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import scheduled tasks', error);
      return false;
    }
  }

  public getTaskHistory(taskId: string, limit: number = 50): ScheduleEvent[] {
    // In a real implementation, this would return actual execution history
    // For now, return empty array
    return [];
  }
}
