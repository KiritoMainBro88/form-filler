import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'progress';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  persistent: boolean;
  actions?: NotificationAction[];
  metadata?: {
    source?: string;
    category?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    data?: any;
  };
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'dismiss';
  action?: () => void;
  url?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationSettings {
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
  vibration: boolean;
  autoHide: boolean;
  autoHideDelay: number; // in milliseconds
  maxNotifications: number;
  categories: {
    [key: string]: {
      enabled: boolean;
      desktop: boolean;
      sound: boolean;
      vibration: boolean;
    };
  };
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
    progress: number;
  };
  byCategory: { [key: string]: number };
}

export class NotificationManager extends EventEmitter {
  private logger: Logger;
  private notifications: Map<string, Notification> = new Map();
  private settings: NotificationSettings;
  private notificationPermission: NotificationPermission = 'default';
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.logger = new Logger();
    this.settings = this.getDefaultSettings();
    this.initializeNotificationAPI();
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      desktop: true,
      sound: true,
      vibration: false,
      autoHide: true,
      autoHideDelay: 5000,
      maxNotifications: 100,
      categories: {
        'form_scan': {
          enabled: true,
          desktop: true,
          sound: false,
          vibration: false
        },
        'form_fill': {
          enabled: true,
          desktop: true,
          sound: true,
          vibration: false
        },
        'batch_job': {
          enabled: true,
          desktop: true,
          sound: true,
          vibration: false
        },
        'scheduler': {
          enabled: true,
          desktop: true,
          sound: true,
          vibration: false
        },
        'system': {
          enabled: true,
          desktop: false,
          sound: false,
          vibration: false
        },
        'error': {
          enabled: true,
          desktop: true,
          sound: true,
          vibration: true
        }
      }
    };
  }

  private async initializeNotificationAPI(): Promise<void> {
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      
      if (this.notificationPermission === 'default') {
        try {
          this.notificationPermission = await Notification.requestPermission();
        } catch (error) {
          this.logger.warn('Failed to request notification permission', error);
        }
      }
    }
  }

  public showNotification(
    type: Notification['type'],
    title: string,
    message: string,
    options?: {
      persistent?: boolean;
      actions?: NotificationAction[];
      category?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      data?: any;
    }
  ): string {
    const notification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      persistent: options?.persistent || false,
      actions: options?.actions || [],
      metadata: {
        source: 'system',
        category: options?.category || 'general',
        priority: options?.priority || 'normal',
        tags: [],
        data: options?.data
      }
    };

    // Check if notifications are enabled for this category
    const category = notification.metadata?.category || 'general';
    const categorySettings = this.settings.categories[category];
    
    if (!this.settings.enabled || !categorySettings?.enabled) {
      this.logger.debug('Notification disabled for category', { category, type });
      return notification.id;
    }

    // Add to internal storage
    this.notifications.set(notification.id, notification);
    this.cleanupOldNotifications();

    // Show desktop notification
    if (this.settings.desktop && categorySettings.desktop && this.notificationPermission === 'granted') {
      this.showDesktopNotification(notification);
    }

    // Play sound
    if (this.settings.sound && categorySettings.sound) {
      this.playNotificationSound(type);
    }

    // Vibrate
    if (this.settings.vibration && categorySettings.vibration && 'vibrate' in navigator) {
      this.vibrate(type);
    }

    // Auto-hide
    if (this.settings.autoHide && !notification.persistent) {
      const timeoutId = setTimeout(() => {
        this.hideNotification(notification.id);
        this.timeouts.delete(notification.id);
      }, this.settings.autoHideDelay);
      this.timeouts.set(notification.id, timeoutId);
    }

    this.logger.info('Notification shown', { 
      id: notification.id, 
      type, 
      title, 
      category 
    });

    this.emit('notification_shown', notification);
    return notification.id;
  }

  public hideNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    // Clear timeout if exists
    const timeout = this.timeouts.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(notificationId);
    }

    this.notifications.delete(notificationId);
    this.emit('notification_hidden', notification);
    
    this.logger.debug('Notification hidden', { id: notificationId });
    return true;
  }

  public markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      return false;
    }

    notification.read = true;
    this.notifications.set(notificationId, notification);
    
    this.emit('notification_read', notification);
    this.logger.debug('Notification marked as read', { id: notificationId });
    return true;
  }

  public markAllAsRead(): void {
    for (const notification of this.notifications.values()) {
      notification.read = true;
    }
    
    this.emit('all_notifications_read');
    this.logger.info('All notifications marked as read');
  }

  public clearAll(): void {
    this.notifications.clear();
    this.emit('notifications_cleared');
    this.logger.info('All notifications cleared');
  }

  public clearByCategory(category: string): number {
    let cleared = 0;
    
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.metadata?.category === category) {
        this.notifications.delete(id);
        cleared++;
      }
    }
    
    this.emit('notifications_cleared_by_category', { category, count: cleared });
    this.logger.info('Notifications cleared by category', { category, count: cleared });
    return cleared;
  }

  public getNotification(notificationId: string): Notification | null {
    return this.notifications.get(notificationId) || null;
  }

  public getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public getUnreadNotifications(): Notification[] {
    return this.getAllNotifications().filter(n => !n.read);
  }

  public getNotificationsByType(type: Notification['type']): Notification[] {
    return this.getAllNotifications().filter(n => n.type === type);
  }

  public getNotificationsByCategory(category: string): Notification[] {
    return this.getAllNotifications().filter(n => n.metadata?.category === category);
  }

  public getStats(): NotificationStats {
    const notifications = this.getAllNotifications();
    
    const byType = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
      progress: 0
    };
    
    const byCategory: { [key: string]: number } = {};
    
    for (const notification of notifications) {
      byType[notification.type]++;
      
      const category = notification.metadata?.category || 'general';
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType,
      byCategory
    };
  }

  public updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settings_updated', this.settings);
    this.logger.info('Notification settings updated');
  }

  public getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  private showDesktopNotification(notification: Notification): void {
    if (!('Notification' in window) || this.notificationPermission !== 'granted') {
      return;
    }

    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: this.getNotificationIcon(notification.type),
        badge: this.getNotificationBadge(notification.type),
        tag: notification.id,
        requireInteraction: notification.persistent,
        silent: !this.settings.sound
      });

      desktopNotification.onclick = () => {
        this.markAsRead(notification.id);
        this.emit('notification_clicked', notification);
        desktopNotification.close();
      };

      desktopNotification.onclose = () => {
        this.emit('notification_closed', notification);
      };

      // Auto-close after delay
      if (!notification.persistent) {
        setTimeout(() => {
          desktopNotification.close();
        }, this.settings.autoHideDelay);
      }

    } catch (error) {
      this.logger.error('Failed to show desktop notification', error);
    }
  }

  private playNotificationSound(type: Notification['type']): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequencies = {
        info: 800,
        success: 1000,
        warning: 600,
        error: 400,
        progress: 900
      };

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

    } catch (error) {
      this.logger.warn('Failed to play notification sound', error);
    }
  }

  private vibrate(type: Notification['type']): void {
    if (!('vibrate' in navigator)) {
      return;
    }

    try {
      const patterns = {
        info: [100],
        success: [100, 50, 100],
        warning: [200, 100, 200],
        error: [300, 100, 300, 100, 300],
        progress: [50]
      };

      navigator.vibrate(patterns[type]);
    } catch (error) {
      this.logger.warn('Failed to vibrate', error);
    }
  }

  private getNotificationIcon(type: Notification['type']): string {
    const icons = {
      info: '/icons/info.png',
      success: '/icons/success.png',
      warning: '/icons/warning.png',
      error: '/icons/error.png',
      progress: '/icons/progress.png'
    };

    return icons[type];
  }

  private getNotificationBadge(type: Notification['type']): string {
    const badges = {
      info: '/icons/badge-info.png',
      success: '/icons/badge-success.png',
      warning: '/icons/badge-warning.png',
      error: '/icons/badge-error.png',
      progress: '/icons/badge-progress.png'
    };

    return badges[type];
  }

  private cleanupOldNotifications(): void {
    if (this.notifications.size <= this.settings.maxNotifications) {
      return;
    }

    const notifications = this.getAllNotifications();
    const toRemove = notifications.slice(this.settings.maxNotifications);
    
    for (const notification of toRemove) {
      this.notifications.delete(notification.id);
    }

    this.logger.debug('Old notifications cleaned up', { removed: toRemove.length });
  }

  // Convenience methods for common notification types

  public showInfo(title: string, message: string, options?: any): string {
    return this.showNotification('info', title, message, options);
  }

  public showSuccess(title: string, message: string, options?: any): string {
    return this.showNotification('success', title, message, options);
  }

  public showWarning(title: string, message: string, options?: any): string {
    return this.showNotification('warning', title, message, options);
  }

  public showError(title: string, message: string, options?: any): string {
    return this.showNotification('error', title, message, options);
  }

  public showProgress(title: string, message: string, options?: any): string {
    return this.showNotification('progress', title, message, options);
  }

  // Form-specific notifications

  public showFormScanStarted(formUrl: string): string {
    return this.showInfo(
      'Form Scan Started',
      `Scanning form: ${formUrl}`,
      { category: 'form_scan', persistent: false }
    );
  }

  public showFormScanCompleted(formUrl: string, questionCount: number): string {
    return this.showSuccess(
      'Form Scan Completed',
      `Found ${questionCount} questions in form`,
      { 
        category: 'form_scan',
        actions: [
          {
            id: 'view-results',
            label: 'View Results',
            type: 'button',
            style: 'primary'
          }
        ]
      }
    );
  }

  public showFormScanFailed(formUrl: string, error: string): string {
    return this.showError(
      'Form Scan Failed',
      `Failed to scan form: ${error}`,
      { 
        category: 'form_scan',
        priority: 'high',
        actions: [
          {
            id: 'retry-scan',
            label: 'Retry',
            type: 'button',
            style: 'primary'
          }
        ]
      }
    );
  }

  public showFormFillStarted(formUrl: string, runNumber: number): string {
    return this.showInfo(
      'Form Fill Started',
      `Filling form (Run ${runNumber})`,
      { category: 'form_fill' }
    );
  }

  public showFormFillCompleted(formUrl: string, runNumber: number): string {
    return this.showSuccess(
      'Form Fill Completed',
      `Successfully filled form (Run ${runNumber})`,
      { category: 'form_fill' }
    );
  }

  public showFormFillFailed(formUrl: string, runNumber: number, error: string): string {
    return this.showError(
      'Form Fill Failed',
      `Failed to fill form (Run ${runNumber}): ${error}`,
      { 
        category: 'form_fill',
        priority: 'high'
      }
    );
  }

  public showBatchJobStarted(jobName: string, totalRuns: number): string {
    return this.showInfo(
      'Batch Job Started',
      `Started batch job "${jobName}" with ${totalRuns} runs`,
      { 
        category: 'batch_job',
        persistent: true
      }
    );
  }

  public showBatchJobProgress(jobName: string, completed: number, total: number): string {
    const percentage = Math.round((completed / total) * 100);
    return this.showProgress(
      'Batch Job Progress',
      `"${jobName}": ${completed}/${total} runs completed (${percentage}%)`,
      { 
        category: 'batch_job',
        persistent: true
      }
    );
  }

  public showBatchJobCompleted(jobName: string, successRate: number): string {
    return this.showSuccess(
      'Batch Job Completed',
      `"${jobName}" completed with ${successRate.toFixed(1)}% success rate`,
      { 
        category: 'batch_job',
        actions: [
          {
            id: 'view-results',
            label: 'View Results',
            type: 'button',
            style: 'primary'
          }
        ]
      }
    );
  }

  public showBatchJobFailed(jobName: string, error: string): string {
    return this.showError(
      'Batch Job Failed',
      `"${jobName}" failed: ${error}`,
      { 
        category: 'batch_job',
        priority: 'high'
      }
    );
  }

  public showScheduledTaskStarted(taskName: string): string {
    return this.showInfo(
      'Scheduled Task Started',
      `Executing scheduled task: ${taskName}`,
      { category: 'scheduler' }
    );
  }

  public showScheduledTaskCompleted(taskName: string): string {
    return this.showSuccess(
      'Scheduled Task Completed',
      `Scheduled task "${taskName}" completed successfully`,
      { category: 'scheduler' }
    );
  }

  public showScheduledTaskFailed(taskName: string, error: string): string {
    return this.showError(
      'Scheduled Task Failed',
      `Scheduled task "${taskName}" failed: ${error}`,
      { 
        category: 'scheduler',
        priority: 'high'
      }
    );
  }

  public showSystemError(error: string): string {
    return this.showError(
      'System Error',
      error,
      { 
        category: 'system',
        priority: 'urgent',
        persistent: true
      }
    );
  }

  public showSystemWarning(warning: string): string {
    return this.showWarning(
      'System Warning',
      warning,
      { category: 'system' }
    );
  }

  public showSystemInfo(info: string): string {
    return this.showInfo(
      'System Information',
      info,
      { category: 'system' }
    );
  }
}
