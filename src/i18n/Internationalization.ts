import { Logger } from '../utils/Logger';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export interface Translation {
  [key: string]: string | Translation;
}

export interface LanguagePack {
  language: Language;
  translations: Translation;
  metadata: {
    version: string;
    lastUpdated: string;
    author: string;
    completeness: number; // 0-100
  };
}

export interface I18nConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  autoDetect: boolean;
  persistLanguage: boolean;
  storageKey: string;
}

export class Internationalization {
  private logger: Logger;
  private currentLanguage: string;
  private fallbackLanguage: string;
  private languagePacks: Map<string, LanguagePack> = new Map();
  private config: I18nConfig;
  private listeners: Set<(language: string) => void> = new Set();

  constructor(config?: Partial<I18nConfig>) {
    this.logger = new Logger();
    this.config = {
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      supportedLanguages: ['en', 'vi', 'es', 'fr', 'de', 'ja', 'ko', 'zh'],
      autoDetect: true,
      persistLanguage: true,
      storageKey: 'gg-form-tool-language',
      ...config
    };

    this.currentLanguage = this.config.defaultLanguage;
    this.initializeLanguage();
  }

  private async initializeLanguage(): Promise<void> {
    // Load persisted language
    if (this.config.persistLanguage) {
      const persistedLanguage = localStorage.getItem(this.config.storageKey);
      if (persistedLanguage && this.config.supportedLanguages.includes(persistedLanguage)) {
        this.currentLanguage = persistedLanguage;
      }
    }

    // Auto-detect browser language
    if (this.config.autoDetect && this.currentLanguage === this.config.defaultLanguage) {
      const browserLanguage = this.detectBrowserLanguage();
      if (browserLanguage) {
        this.currentLanguage = browserLanguage;
      }
    }

    // Load default language pack
    await this.loadLanguagePack(this.currentLanguage);
  }

  private detectBrowserLanguage(): string | null {
    if (typeof navigator === 'undefined') return null;

    const browserLanguages = [
      navigator.language,
      ...(navigator.languages || [])
    ];

    for (const lang of browserLanguages) {
      const languageCode = lang.split('-')[0];
      if (this.config.supportedLanguages.includes(languageCode)) {
        return languageCode;
      }
    }

    return null;
  }

  public async loadLanguagePack(languageCode: string): Promise<boolean> {
    try {
      // Check if already loaded
      if (this.languagePacks.has(languageCode)) {
        return true;
      }

      // Load language pack
      const languagePack = await this.fetchLanguagePack(languageCode);
      if (languagePack) {
        this.languagePacks.set(languageCode, languagePack);
        this.logger.info('Language pack loaded', { language: languageCode });
        return true;
      }

      return false;
    } catch (error: any) {
      this.logger.error('Failed to load language pack', { language: languageCode, error });
      return false;
    }
  }

  private async fetchLanguagePack(languageCode: string): Promise<LanguagePack | null> {
    // In a real implementation, this would fetch from a server or local files
    // For now, we'll return built-in language packs
    return this.getBuiltInLanguagePack(languageCode);
  }

  private getBuiltInLanguagePack(languageCode: string): LanguagePack | null {
    const languagePacks: { [key: string]: LanguagePack } = {
      en: {
        language: {
          code: 'en',
          name: 'English',
          nativeName: 'English',
          flag: '🇺🇸',
          rtl: false
        },
        translations: {
          // Common
          common: {
            save: 'Save',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            add: 'Add',
            remove: 'Remove',
            confirm: 'Confirm',
            close: 'Close',
            back: 'Back',
            next: 'Next',
            previous: 'Previous',
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            warning: 'Warning',
            info: 'Information',
            yes: 'Yes',
            no: 'No',
            ok: 'OK',
            retry: 'Retry',
            refresh: 'Refresh',
            search: 'Search',
            filter: 'Filter',
            sort: 'Sort',
            export: 'Export',
            import: 'Import',
            download: 'Download',
            upload: 'Upload',
            copy: 'Copy',
            paste: 'Paste',
            cut: 'Cut',
            undo: 'Undo',
            redo: 'Redo',
            selectAll: 'Select All',
            deselectAll: 'Deselect All'
          },
          // Navigation
          navigation: {
            dashboard: 'Dashboard',
            forms: 'Forms',
            templates: 'Templates',
            batch: 'Batch Jobs',
            scheduler: 'Scheduler',
            analytics: 'Analytics',
            settings: 'Settings',
            help: 'Help',
            about: 'About'
          },
          // Form Scanner
          formScanner: {
            title: 'Form Scanner',
            description: 'Scan Google Forms to extract questions and configuration',
            scanForm: 'Scan Form',
            enterUrl: 'Enter Google Form URL',
            scanning: 'Scanning form...',
            scanComplete: 'Scan completed successfully',
            scanFailed: 'Scan failed',
            questionsFound: 'Questions found',
            noQuestions: 'No questions found',
            formTitle: 'Form Title',
            formDescription: 'Form Description',
            questionTypes: 'Question Types',
            confidence: 'Confidence',
            required: 'Required',
            optional: 'Optional'
          },
          // Form Filler
          formFiller: {
            title: 'Form Filler',
            description: 'Configure and execute form filling',
            configure: 'Configure',
            execute: 'Execute',
            runs: 'Runs',
            delay: 'Delay (ms)',
            headless: 'Headless Mode',
            strategies: 'Fill Strategies',
            customValues: 'Custom Values',
            executing: 'Executing...',
            completed: 'Completed',
            failed: 'Failed',
            successRate: 'Success Rate',
            totalTime: 'Total Time',
            averageTime: 'Average Time'
          },
          // Strategies
          strategies: {
            title: 'Fill Strategies',
            realisticText: 'Realistic Text',
            patternText: 'Pattern Text',
            aiGenerated: 'AI Generated',
            smartChoice: 'Smart Choice',
            weightedChoice: 'Weighted Choice',
            contextAware: 'Context Aware',
            realisticDate: 'Realistic Date',
            recentDate: 'Recent Date',
            futureDate: 'Future Date',
            smartFile: 'Smart File',
            customPattern: 'Custom Pattern',
            conditional: 'Conditional'
          },
          // Templates
          templates: {
            title: 'Templates',
            description: 'Pre-built configurations for common form types',
            builtIn: 'Built-in Templates',
            custom: 'Custom Templates',
            create: 'Create Template',
            edit: 'Edit Template',
            delete: 'Delete Template',
            import: 'Import Template',
            export: 'Export Template',
            apply: 'Apply Template',
            categories: 'Categories',
            difficulty: 'Difficulty',
            estimatedTime: 'Estimated Time',
            popularity: 'Popularity'
          },
          // Batch Processing
          batch: {
            title: 'Batch Processing',
            description: 'Process multiple forms simultaneously',
            createJob: 'Create Batch Job',
            jobName: 'Job Name',
            jobDescription: 'Job Description',
            forms: 'Forms',
            addForm: 'Add Form',
            removeForm: 'Remove Form',
            executionSettings: 'Execution Settings',
            maxConcurrent: 'Max Concurrent',
            delayBetweenForms: 'Delay Between Forms',
            delayBetweenRuns: 'Delay Between Runs',
            retryAttempts: 'Retry Attempts',
            jobStatus: 'Job Status',
            progress: 'Progress',
            results: 'Results',
            startJob: 'Start Job',
            pauseJob: 'Pause Job',
            resumeJob: 'Resume Job',
            cancelJob: 'Cancel Job'
          },
          // Scheduler
          scheduler: {
            title: 'Scheduler',
            description: 'Schedule automated form filling',
            createTask: 'Create Task',
            taskName: 'Task Name',
            taskDescription: 'Task Description',
            schedule: 'Schedule',
            scheduleType: 'Schedule Type',
            once: 'Once',
            interval: 'Interval',
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
            cron: 'Cron',
            startDate: 'Start Date',
            endDate: 'End Date',
            timezone: 'Timezone',
            taskType: 'Task Type',
            formFill: 'Form Fill',
            batchJob: 'Batch Job',
            taskStatus: 'Task Status',
            lastRun: 'Last Run',
            nextRun: 'Next Run',
            totalRuns: 'Total Runs',
            successfulRuns: 'Successful Runs',
            failedRuns: 'Failed Runs'
          },
          // Analytics
          analytics: {
            title: 'Analytics',
            description: 'Performance metrics and insights',
            overview: 'Overview',
            performance: 'Performance',
            forms: 'Forms',
            errors: 'Errors',
            trends: 'Trends',
            totalJobs: 'Total Jobs',
            successRate: 'Success Rate',
            totalRuns: 'Total Runs',
            totalTime: 'Total Time',
            averageJobTime: 'Average Job Time',
            averageRunTime: 'Average Run Time',
            fastestRun: 'Fastest Run',
            slowestRun: 'Slowest Run',
            mostProcessed: 'Most Processed Forms',
            mostSuccessful: 'Most Successful Forms',
            mostFailed: 'Most Failed Forms',
            commonErrors: 'Common Errors',
            recentErrors: 'Recent Errors',
            dailyJobs: 'Daily Jobs',
            hourlyActivity: 'Hourly Activity'
          },
          // Settings
          settings: {
            title: 'Settings',
            description: 'Configure application settings',
            general: 'General',
            appearance: 'Appearance',
            notifications: 'Notifications',
            language: 'Language',
            theme: 'Theme',
            darkMode: 'Dark Mode',
            lightMode: 'Light Mode',
            autoMode: 'Auto Mode',
            fontSize: 'Font Size',
            compactMode: 'Compact Mode',
            enableNotifications: 'Enable Notifications',
            desktopNotifications: 'Desktop Notifications',
            soundNotifications: 'Sound Notifications',
            vibrationNotifications: 'Vibration Notifications',
            autoHide: 'Auto Hide',
            autoHideDelay: 'Auto Hide Delay',
            maxNotifications: 'Max Notifications',
            categories: 'Categories',
            save: 'Save Settings',
            reset: 'Reset to Defaults'
          },
          // Notifications
          notifications: {
            title: 'Notifications',
            description: 'Manage system notifications',
            all: 'All Notifications',
            unread: 'Unread',
            read: 'Read',
            markAsRead: 'Mark as Read',
            markAllAsRead: 'Mark All as Read',
            clearAll: 'Clear All',
            clearByCategory: 'Clear by Category',
            noNotifications: 'No notifications',
            formScanStarted: 'Form scan started',
            formScanCompleted: 'Form scan completed',
            formScanFailed: 'Form scan failed',
            formFillStarted: 'Form fill started',
            formFillCompleted: 'Form fill completed',
            formFillFailed: 'Form fill failed',
            batchJobStarted: 'Batch job started',
            batchJobProgress: 'Batch job progress',
            batchJobCompleted: 'Batch job completed',
            batchJobFailed: 'Batch job failed',
            scheduledTaskStarted: 'Scheduled task started',
            scheduledTaskCompleted: 'Scheduled task completed',
            scheduledTaskFailed: 'Scheduled task failed',
            systemError: 'System error',
            systemWarning: 'System warning',
            systemInfo: 'System information'
          },
          // Errors
          errors: {
            invalidUrl: 'Invalid URL format',
            networkError: 'Network error',
            formNotFound: 'Form not found',
            accessDenied: 'Access denied',
            scanFailed: 'Form scan failed',
            fillFailed: 'Form fill failed',
            validationError: 'Validation error',
            configurationError: 'Configuration error',
            systemError: 'System error',
            unknownError: 'Unknown error occurred',
            retryLater: 'Please try again later',
            checkConnection: 'Check your internet connection',
            contactSupport: 'Contact support if the problem persists'
          },
          // Success Messages
          success: {
            formScanned: 'Form scanned successfully',
            formFilled: 'Form filled successfully',
            configurationSaved: 'Configuration saved',
            templateCreated: 'Template created',
            templateUpdated: 'Template updated',
            templateDeleted: 'Template deleted',
            batchJobCreated: 'Batch job created',
            batchJobStarted: 'Batch job started',
            batchJobCompleted: 'Batch job completed',
            scheduledTaskCreated: 'Scheduled task created',
            scheduledTaskUpdated: 'Scheduled task updated',
            scheduledTaskDeleted: 'Scheduled task deleted',
            settingsSaved: 'Settings saved',
            dataExported: 'Data exported',
            dataImported: 'Data imported'
          }
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          author: 'System',
          completeness: 100
        }
      },
      vi: {
        language: {
          code: 'vi',
          name: 'Vietnamese',
          nativeName: 'Tiếng Việt',
          flag: '🇻🇳',
          rtl: false
        },
        translations: {
          // Common
          common: {
            save: 'Lưu',
            cancel: 'Hủy',
            delete: 'Xóa',
            edit: 'Sửa',
            add: 'Thêm',
            remove: 'Xóa',
            confirm: 'Xác nhận',
            close: 'Đóng',
            back: 'Quay lại',
            next: 'Tiếp theo',
            previous: 'Trước đó',
            loading: 'Đang tải...',
            error: 'Lỗi',
            success: 'Thành công',
            warning: 'Cảnh báo',
            info: 'Thông tin',
            yes: 'Có',
            no: 'Không',
            ok: 'OK',
            retry: 'Thử lại',
            refresh: 'Làm mới',
            search: 'Tìm kiếm',
            filter: 'Lọc',
            sort: 'Sắp xếp',
            export: 'Xuất',
            import: 'Nhập',
            download: 'Tải xuống',
            upload: 'Tải lên',
            copy: 'Sao chép',
            paste: 'Dán',
            cut: 'Cắt',
            undo: 'Hoàn tác',
            redo: 'Làm lại',
            selectAll: 'Chọn tất cả',
            deselectAll: 'Bỏ chọn tất cả'
          },
          // Navigation
          navigation: {
            dashboard: 'Bảng điều khiển',
            forms: 'Biểu mẫu',
            templates: 'Mẫu',
            batch: 'Xử lý hàng loạt',
            scheduler: 'Lịch trình',
            analytics: 'Phân tích',
            settings: 'Cài đặt',
            help: 'Trợ giúp',
            about: 'Giới thiệu'
          },
          // Form Scanner
          formScanner: {
            title: 'Quét Biểu mẫu',
            description: 'Quét Google Forms để trích xuất câu hỏi và cấu hình',
            scanForm: 'Quét Biểu mẫu',
            enterUrl: 'Nhập URL Google Form',
            scanning: 'Đang quét biểu mẫu...',
            scanComplete: 'Quét hoàn thành thành công',
            scanFailed: 'Quét thất bại',
            questionsFound: 'Câu hỏi được tìm thấy',
            noQuestions: 'Không tìm thấy câu hỏi',
            formTitle: 'Tiêu đề Biểu mẫu',
            formDescription: 'Mô tả Biểu mẫu',
            questionTypes: 'Loại Câu hỏi',
            confidence: 'Độ tin cậy',
            required: 'Bắt buộc',
            optional: 'Tùy chọn'
          },
          // Form Filler
          formFiller: {
            title: 'Điền Biểu mẫu',
            description: 'Cấu hình và thực thi việc điền biểu mẫu',
            configure: 'Cấu hình',
            execute: 'Thực thi',
            runs: 'Số lần chạy',
            delay: 'Độ trễ (ms)',
            headless: 'Chế độ Ẩn',
            strategies: 'Chiến lược Điền',
            customValues: 'Giá trị Tùy chỉnh',
            executing: 'Đang thực thi...',
            completed: 'Hoàn thành',
            failed: 'Thất bại',
            successRate: 'Tỷ lệ Thành công',
            totalTime: 'Tổng Thời gian',
            averageTime: 'Thời gian Trung bình'
          },
          // Strategies
          strategies: {
            title: 'Chiến lược Điền',
            realisticText: 'Văn bản Thực tế',
            patternText: 'Văn bản Mẫu',
            aiGenerated: 'AI Tạo',
            smartChoice: 'Lựa chọn Thông minh',
            weightedChoice: 'Lựa chọn Có trọng số',
            contextAware: 'Nhận biết Ngữ cảnh',
            realisticDate: 'Ngày Thực tế',
            recentDate: 'Ngày Gần đây',
            futureDate: 'Ngày Tương lai',
            smartFile: 'Tệp Thông minh',
            customPattern: 'Mẫu Tùy chỉnh',
            conditional: 'Có điều kiện'
          },
          // Templates
          templates: {
            title: 'Mẫu',
            description: 'Cấu hình sẵn cho các loại biểu mẫu phổ biến',
            builtIn: 'Mẫu Sẵn có',
            custom: 'Mẫu Tùy chỉnh',
            create: 'Tạo Mẫu',
            edit: 'Sửa Mẫu',
            delete: 'Xóa Mẫu',
            import: 'Nhập Mẫu',
            export: 'Xuất Mẫu',
            apply: 'Áp dụng Mẫu',
            categories: 'Danh mục',
            difficulty: 'Độ khó',
            estimatedTime: 'Thời gian Ước tính',
            popularity: 'Độ phổ biến'
          },
          // Batch Processing
          batch: {
            title: 'Xử lý Hàng loạt',
            description: 'Xử lý nhiều biểu mẫu đồng thời',
            createJob: 'Tạo Công việc Hàng loạt',
            jobName: 'Tên Công việc',
            jobDescription: 'Mô tả Công việc',
            forms: 'Biểu mẫu',
            addForm: 'Thêm Biểu mẫu',
            removeForm: 'Xóa Biểu mẫu',
            executionSettings: 'Cài đặt Thực thi',
            maxConcurrent: 'Tối đa Đồng thời',
            delayBetweenForms: 'Độ trễ Giữa Biểu mẫu',
            delayBetweenRuns: 'Độ trễ Giữa Lần chạy',
            retryAttempts: 'Số lần Thử lại',
            jobStatus: 'Trạng thái Công việc',
            progress: 'Tiến độ',
            results: 'Kết quả',
            startJob: 'Bắt đầu Công việc',
            pauseJob: 'Tạm dừng Công việc',
            resumeJob: 'Tiếp tục Công việc',
            cancelJob: 'Hủy Công việc'
          },
          // Scheduler
          scheduler: {
            title: 'Lịch trình',
            description: 'Lên lịch điền biểu mẫu tự động',
            createTask: 'Tạo Tác vụ',
            taskName: 'Tên Tác vụ',
            taskDescription: 'Mô tả Tác vụ',
            schedule: 'Lịch trình',
            scheduleType: 'Loại Lịch trình',
            once: 'Một lần',
            interval: 'Khoảng thời gian',
            daily: 'Hàng ngày',
            weekly: 'Hàng tuần',
            monthly: 'Hàng tháng',
            cron: 'Cron',
            startDate: 'Ngày Bắt đầu',
            endDate: 'Ngày Kết thúc',
            timezone: 'Múi giờ',
            taskType: 'Loại Tác vụ',
            formFill: 'Điền Biểu mẫu',
            batchJob: 'Công việc Hàng loạt',
            taskStatus: 'Trạng thái Tác vụ',
            lastRun: 'Lần chạy Cuối',
            nextRun: 'Lần chạy Tiếp theo',
            totalRuns: 'Tổng Lần chạy',
            successfulRuns: 'Lần chạy Thành công',
            failedRuns: 'Lần chạy Thất bại'
          },
          // Analytics
          analytics: {
            title: 'Phân tích',
            description: 'Số liệu hiệu suất và thông tin chi tiết',
            overview: 'Tổng quan',
            performance: 'Hiệu suất',
            forms: 'Biểu mẫu',
            errors: 'Lỗi',
            trends: 'Xu hướng',
            totalJobs: 'Tổng Công việc',
            successRate: 'Tỷ lệ Thành công',
            totalRuns: 'Tổng Lần chạy',
            totalTime: 'Tổng Thời gian',
            averageJobTime: 'Thời gian Công việc Trung bình',
            averageRunTime: 'Thời gian Chạy Trung bình',
            fastestRun: 'Lần chạy Nhanh nhất',
            slowestRun: 'Lần chạy Chậm nhất',
            mostProcessed: 'Biểu mẫu Xử lý Nhiều nhất',
            mostSuccessful: 'Biểu mẫu Thành công Nhiều nhất',
            mostFailed: 'Biểu mẫu Thất bại Nhiều nhất',
            commonErrors: 'Lỗi Thường gặp',
            recentErrors: 'Lỗi Gần đây',
            dailyJobs: 'Công việc Hàng ngày',
            hourlyActivity: 'Hoạt động Hàng giờ'
          },
          // Settings
          settings: {
            title: 'Cài đặt',
            description: 'Cấu hình cài đặt ứng dụng',
            general: 'Chung',
            appearance: 'Giao diện',
            notifications: 'Thông báo',
            language: 'Ngôn ngữ',
            theme: 'Chủ đề',
            darkMode: 'Chế độ Tối',
            lightMode: 'Chế độ Sáng',
            autoMode: 'Chế độ Tự động',
            fontSize: 'Cỡ chữ',
            compactMode: 'Chế độ Compact',
            enableNotifications: 'Bật Thông báo',
            desktopNotifications: 'Thông báo Desktop',
            soundNotifications: 'Thông báo Âm thanh',
            vibrationNotifications: 'Thông báo Rung',
            autoHide: 'Tự động Ẩn',
            autoHideDelay: 'Độ trễ Tự động Ẩn',
            maxNotifications: 'Tối đa Thông báo',
            categories: 'Danh mục',
            save: 'Lưu Cài đặt',
            reset: 'Đặt lại Mặc định'
          },
          // Notifications
          notifications: {
            title: 'Thông báo',
            description: 'Quản lý thông báo hệ thống',
            all: 'Tất cả Thông báo',
            unread: 'Chưa đọc',
            read: 'Đã đọc',
            markAsRead: 'Đánh dấu Đã đọc',
            markAllAsRead: 'Đánh dấu Tất cả Đã đọc',
            clearAll: 'Xóa Tất cả',
            clearByCategory: 'Xóa theo Danh mục',
            noNotifications: 'Không có thông báo',
            formScanStarted: 'Bắt đầu quét biểu mẫu',
            formScanCompleted: 'Hoàn thành quét biểu mẫu',
            formScanFailed: 'Quét biểu mẫu thất bại',
            formFillStarted: 'Bắt đầu điền biểu mẫu',
            formFillCompleted: 'Hoàn thành điền biểu mẫu',
            formFillFailed: 'Điền biểu mẫu thất bại',
            batchJobStarted: 'Bắt đầu công việc hàng loạt',
            batchJobProgress: 'Tiến độ công việc hàng loạt',
            batchJobCompleted: 'Hoàn thành công việc hàng loạt',
            batchJobFailed: 'Công việc hàng loạt thất bại',
            scheduledTaskStarted: 'Bắt đầu tác vụ đã lên lịch',
            scheduledTaskCompleted: 'Hoàn thành tác vụ đã lên lịch',
            scheduledTaskFailed: 'Tác vụ đã lên lịch thất bại',
            systemError: 'Lỗi hệ thống',
            systemWarning: 'Cảnh báo hệ thống',
            systemInfo: 'Thông tin hệ thống'
          },
          // Errors
          errors: {
            invalidUrl: 'Định dạng URL không hợp lệ',
            networkError: 'Lỗi mạng',
            formNotFound: 'Không tìm thấy biểu mẫu',
            accessDenied: 'Truy cập bị từ chối',
            scanFailed: 'Quét biểu mẫu thất bại',
            fillFailed: 'Điền biểu mẫu thất bại',
            validationError: 'Lỗi xác thực',
            configurationError: 'Lỗi cấu hình',
            systemError: 'Lỗi hệ thống',
            unknownError: 'Đã xảy ra lỗi không xác định',
            retryLater: 'Vui lòng thử lại sau',
            checkConnection: 'Kiểm tra kết nối internet',
            contactSupport: 'Liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục'
          },
          // Success Messages
          success: {
            formScanned: 'Quét biểu mẫu thành công',
            formFilled: 'Điền biểu mẫu thành công',
            configurationSaved: 'Đã lưu cấu hình',
            templateCreated: 'Đã tạo mẫu',
            templateUpdated: 'Đã cập nhật mẫu',
            templateDeleted: 'Đã xóa mẫu',
            batchJobCreated: 'Đã tạo công việc hàng loạt',
            batchJobStarted: 'Đã bắt đầu công việc hàng loạt',
            batchJobCompleted: 'Đã hoàn thành công việc hàng loạt',
            scheduledTaskCreated: 'Đã tạo tác vụ đã lên lịch',
            scheduledTaskUpdated: 'Đã cập nhật tác vụ đã lên lịch',
            scheduledTaskDeleted: 'Đã xóa tác vụ đã lên lịch',
            settingsSaved: 'Đã lưu cài đặt',
            dataExported: 'Đã xuất dữ liệu',
            dataImported: 'Đã nhập dữ liệu'
          }
        },
        metadata: {
          version: '1.0.0',
          lastUpdated: new Date().toISOString(),
          author: 'System',
          completeness: 100
        }
      }
    };

    return languagePacks[languageCode] || null;
  }

  public setLanguage(languageCode: string): boolean {
    if (!this.config.supportedLanguages.includes(languageCode)) {
      this.logger.warn('Unsupported language', { language: languageCode });
      return false;
    }

    this.currentLanguage = languageCode;
    
    // Persist language preference
    if (this.config.persistLanguage) {
      localStorage.setItem(this.config.storageKey, languageCode);
    }

    // Load language pack if not already loaded
    this.loadLanguagePack(languageCode);

    // Notify listeners
    this.listeners.forEach(listener => listener(languageCode));
    
    this.logger.info('Language changed', { language: languageCode });
    this.emit('language_changed', languageCode);
    
    return true;
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getSupportedLanguages(): Language[] {
    const languages: Language[] = [];
    
    for (const languageCode of this.config.supportedLanguages) {
      const languagePack = this.languagePacks.get(languageCode);
      if (languagePack) {
        languages.push(languagePack.language);
      }
    }
    
    return languages;
  }

  public t(key: string, params?: { [key: string]: any }): string {
    const languagePack = this.languagePacks.get(this.currentLanguage);
    if (!languagePack) {
      return key; // Return key if language pack not loaded
    }

    const translation = this.getNestedTranslation(languagePack.translations, key);
    
    if (!translation) {
      // Try fallback language
      const fallbackPack = this.languagePacks.get(this.fallbackLanguage);
      if (fallbackPack) {
        const fallbackTranslation = this.getNestedTranslation(fallbackPack.translations, key);
        if (fallbackTranslation) {
          return this.interpolate(fallbackTranslation, params);
        }
      }
      
      // Return key if no translation found
      this.logger.warn('Translation not found', { key, language: this.currentLanguage });
      return key;
    }

    return this.interpolate(translation, params);
  }

  private getNestedTranslation(translations: Translation, key: string): string | null {
    const keys = key.split('.');
    let current: any = translations;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }
    
    return typeof current === 'string' ? current : null;
  }

  private interpolate(text: string, params?: { [key: string]: any }): string {
    if (!params) return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  public addLanguageChangeListener(listener: (language: string) => void): void {
    this.listeners.add(listener);
  }

  public removeLanguageChangeListener(listener: (language: string) => void): void {
    this.listeners.delete(listener);
  }

  public getLanguagePack(languageCode: string): LanguagePack | null {
    return this.languagePacks.get(languageCode) || null;
  }

  public getAllLanguagePacks(): LanguagePack[] {
    return Array.from(this.languagePacks.values());
  }

  public isLanguageLoaded(languageCode: string): boolean {
    return this.languagePacks.has(languageCode);
  }

  public getCompleteness(languageCode: string): number {
    const languagePack = this.languagePacks.get(languageCode);
    return languagePack?.metadata.completeness || 0;
  }

  public exportTranslations(languageCode: string): string {
    const languagePack = this.languagePacks.get(languageCode);
    if (!languagePack) {
      return '';
    }
    
    return JSON.stringify(languagePack, null, 2);
  }

  public importTranslations(languageCode: string, translationsData: string): boolean {
    try {
      const languagePack = JSON.parse(translationsData) as LanguagePack;
      
      // Validate structure
      if (!languagePack.language || !languagePack.translations) {
        throw new Error('Invalid language pack structure');
      }
      
      languagePack.language.code = languageCode;
      languagePack.metadata.updatedAt = new Date().toISOString();
      
      this.languagePacks.set(languageCode, languagePack);
      
      this.logger.info('Translations imported', { language: languageCode });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import translations', { language: languageCode, error });
      return false;
    }
  }

  public getConfig(): I18nConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<I18nConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('I18n configuration updated');
  }
}