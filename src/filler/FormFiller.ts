import { chromium, Browser, Page } from 'playwright';
import { Logger } from '../utils/Logger';
import { FormConfig, FillStrategy } from '../utils/ConfigManager';
import { format, subDays } from 'date-fns';
import * as path from 'path';

export interface FillingProgress {
  currentRun: number;
  totalRuns: number;
  currentQuestion?: string;
  status: 'starting' | 'filling' | 'submitting' | 'completed' | 'error';
  message: string;
  successCount: number;
  errorCount: number;
}

export interface FillingResult {
  totalRuns: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    run: number;
    error: string;
    timestamp: string;
  }>;
  duration: number;
}

export class FormFiller {
  private logger: Logger;
  private browser: Browser | null = null;

  constructor() {
    this.logger = new Logger();
  }

  public async startFilling(
    config: FormConfig, 
    progressCallback: (progress: FillingProgress) => void
  ): Promise<FillingResult> {
    const startTime = Date.now();
    const result: FillingResult = {
      totalRuns: config.executionSettings.runs,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duration: 0,
    };

    this.logger.info('Starting form filling', { 
      runs: config.executionSettings.runs,
      headless: config.executionSettings.headless 
    });

    try {
      for (let run = 1; run <= config.executionSettings.runs; run++) {
        progressCallback({
          currentRun: run,
          totalRuns: config.executionSettings.runs,
          status: 'starting',
          message: `Starting run ${run}/${config.executionSettings.runs}`,
          successCount: result.successCount,
          errorCount: result.errorCount,
        });

        try {
          await this.fillSingleForm(config, run, progressCallback);
          result.successCount++;
          
          progressCallback({
            currentRun: run,
            totalRuns: config.executionSettings.runs,
            status: 'completed',
            message: `Run ${run} completed successfully`,
            successCount: result.successCount,
            errorCount: result.errorCount,
          });

          // Delay between runs (except for the last one)
          if (run < config.executionSettings.runs) {
            await this.delay(config.executionSettings.delayBetweenRuns);
          }
         } catch (error: any) {
           result.errorCount++;
           result.errors.push({
             run,
             error: error?.message || String(error),
             timestamp: new Date().toISOString(),
           });

           this.logger.error(`Run ${run} failed`, error);
          
          progressCallback({
            currentRun: run,
            totalRuns: config.executionSettings.runs,
            status: 'error',
            message: `Run ${run} failed: ${error?.message || String(error)}`,
            successCount: result.successCount,
            errorCount: result.errorCount,
          });
        }
      }
    } finally {
      await this.cleanup();
      result.duration = Date.now() - startTime;
    }

    this.logger.info('Form filling completed', result);
    return result;
  }

  private async fillSingleForm(
    config: FormConfig, 
    runNumber: number, 
    progressCallback: (progress: FillingProgress) => void
  ): Promise<void> {
    let page: Page | null = null;

    try {
      // Launch browser if not already launched
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: config.executionSettings.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      }

      page = await this.browser.newPage();

      // Set stealth settings
      await this.setupStealth(page);

      // Navigate to form
      progressCallback({
        currentRun: runNumber,
        totalRuns: config.executionSettings.runs,
        status: 'filling',
        message: 'Navigating to form...',
        successCount: 0,
        errorCount: 0,
      });

      await page.goto(config.formUrl, { waitUntil: 'networkidle' });
      await this.delay(1000 + Math.random() * 2000); // Random delay

      // Fill each question
      for (const [questionId, strategy] of Object.entries(config.fillStrategies)) {
        if (strategy.strategy === 'skip') continue;

        progressCallback({
          currentRun: runNumber,
          totalRuns: config.executionSettings.runs,
          status: 'filling',
          currentQuestion: questionId,
          message: `Filling question: ${questionId}`,
          successCount: 0,
          errorCount: 0,
        });

        await this.fillQuestion(page, questionId, strategy);
        await this.delay(500 + Math.random() * 1000); // Random delay between questions
      }

      // Submit form
      progressCallback({
        currentRun: runNumber,
        totalRuns: config.executionSettings.runs,
        status: 'submitting',
        message: 'Submitting form...',
        successCount: 0,
        errorCount: 0,
      });

      await this.submitForm(page);
      
      // Wait for confirmation page
      await this.waitForConfirmation(page);

    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async setupStealth(page: Page): Promise<void> {
    // Set user agent
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Set viewport
    await page.setViewportSize({ width: 1366, height: 768 });
    
    // Override navigator properties
    await page.addInitScript(() => {
      Object.defineProperty((globalThis as any).navigator, 'webdriver', {
        get: () => undefined,
      });
    });
  }

  private async fillQuestion(page: Page, questionId: string, strategy: FillStrategy): Promise<void> {
    try {
      // Find the question element
      const questionElement = await this.findQuestionElement(page, questionId);
      if (!questionElement) {
        throw new Error(`Question element not found: ${questionId}`);
      }

      // Determine question type and fill accordingly
      const questionType = await this.detectQuestionType(page, questionElement);
      
      switch (questionType) {
        case 'text':
        case 'paragraph':
          await this.fillTextQuestion(page, questionElement, strategy);
          break;
        case 'multiple_choice':
          await this.fillMultipleChoiceQuestion(page, questionElement, strategy);
          break;
        case 'checkbox':
          await this.fillCheckboxQuestion(page, questionElement, strategy);
          break;
        case 'dropdown':
          await this.fillDropdownQuestion(page, questionElement, strategy);
          break;
        case 'linear_scale':
          await this.fillLinearScaleQuestion(page, questionElement, strategy);
          break;
        case 'date':
          await this.fillDateQuestion(page, questionElement, strategy);
          break;
        case 'time':
          await this.fillTimeQuestion(page, questionElement, strategy);
          break;
        case 'file_upload':
          await this.fillFileUploadQuestion(page, questionElement, strategy);
          break;
        default:
          this.logger.warn(`Unknown question type: ${questionType}`, { questionId });
      }
    } catch (error) {
      this.logger.error(`Failed to fill question ${questionId}`, error);
      throw error;
    }
  }

  private async findQuestionElement(page: Page, questionId: string): Promise<any> {
    // Try multiple selectors to find the question element
    const selectors = [
      `[name="${questionId}"]`,
      `[data-params*="${questionId}"]`,
      `input[name="${questionId}"]`,
      `select[name="${questionId}"]`,
      `textarea[name="${questionId}"]`,
    ];

    // Only add ID selector if questionId doesn't contain dots (which need CSS escaping)
    if (!questionId.includes('.')) {
      selectors.push(`#${questionId}`);
    } else {
      // For IDs with dots, use CSS.escape or attribute selector
      selectors.push(`[id="${questionId}"]`);
    }

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        // Skip invalid selectors
        continue;
      }
    }

    return null;
  }

  private async detectQuestionType(_page: Page, element: any): Promise<string> {
    const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
    const type = await element.getAttribute('type');
    const role = await element.getAttribute('role');

    if (tagName === 'input') {
      if (type === 'radio') return 'multiple_choice';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'date') return 'date';
      if (type === 'time') return 'time';
      if (type === 'file') return 'file_upload';
      return 'text';
    }

    if (tagName === 'select') return 'dropdown';
    if (tagName === 'textarea') return 'paragraph';
    if (role === 'radiogroup') return 'multiple_choice';
    if (role === 'checkbox') return 'checkbox';

    return 'text';
  }

  private async fillTextQuestion(_page: Page, element: any, strategy: FillStrategy): Promise<void> {
    const value = this.generateValue(strategy, 'text');
    await element.fill(value);
  }

  private async fillMultipleChoiceQuestion(page: Page, element: any, strategy: FillStrategy): Promise<void> {
    const options = await this.getQuestionOptions(page, element);
    let selectedOption: string | null = null;
    
    // Use selectedOptions if available, otherwise use random selection
    if (strategy.selectedOptions && strategy.selectedOptions.length > 0) {
      selectedOption = strategy.selectedOptions[0]; // Take first selected option for multiple choice
    } else {
      selectedOption = this.selectOption(strategy, options);
    }
    
    if (selectedOption) {
      // Find and click the radio button for the selected option
      const radioButton = await page.$(`input[type="radio"][value="${selectedOption}"]`);
      if (radioButton) {
        await radioButton.click();
      } else {
        // Fallback: try to find by text content
        const optionElement = await page.$(`text=${selectedOption}`);
        if (optionElement) {
          await optionElement.click();
        }
      }
    }
  }

  private async fillCheckboxQuestion(page: Page, _element: any, strategy: FillStrategy): Promise<void> {
    const options = await this.getQuestionOptions(page, _element);
    let selectedOptions: string[] = [];
    
    // Use selectedOptions if available, otherwise use random selection
    if (strategy.selectedOptions && strategy.selectedOptions.length > 0) {
      selectedOptions = strategy.selectedOptions;
    } else {
      selectedOptions = this.selectMultipleOptions(strategy, options);
    }
    
    for (const option of selectedOptions) {
      const checkbox = await page.$(`input[type="checkbox"][value="${option}"]`);
      if (checkbox) {
        await checkbox.check();
      } else {
        // Fallback: try to find by text content
        const optionElement = await page.$(`text=${option}`);
        if (optionElement) {
          await optionElement.click();
        }
      }
    }
  }

  private async fillDropdownQuestion(page: Page, element: any, strategy: FillStrategy): Promise<void> {
    const options = await this.getQuestionOptions(page, element);
    const selectedOption = this.selectOption(strategy, options);
    
    if (selectedOption) {
      await element.selectOption(selectedOption);
    }
  }

  private async fillLinearScaleQuestion(page: Page, _element: any, strategy: FillStrategy): Promise<void> {
    const value = this.generateValue(strategy, 'number');
    const scaleElement = await page.$(`input[type="radio"][value="${value}"]`);
    if (scaleElement) {
      await scaleElement.click();
    }
  }

  private async fillDateQuestion(_page: Page, element: any, strategy: FillStrategy): Promise<void> {
    const dateValue = this.generateDateValue(strategy);
    await element.fill(dateValue);
  }

  private async fillTimeQuestion(_page: Page, element: any, strategy: FillStrategy): Promise<void> {
    const timeValue = this.generateTimeValue(strategy);
    await element.fill(timeValue);
  }

  private async fillFileUploadQuestion(_page: Page, element: any, strategy: FillStrategy): Promise<void> {
    if (strategy.value && typeof strategy.value === 'string') {
      const filePath = path.resolve(strategy.value);
      await element.setInputFiles(filePath);
    }
  }

  private async getQuestionOptions(_page: Page, _element: any): Promise<string[]> {
    // Implementation to get available options for a question
    // This would need to be implemented based on the specific DOM structure
    return [];
  }

  private generateValue(strategy: FillStrategy, type: string): string {
    switch (strategy.strategy) {
      case 'fixed':
        return String(strategy.value || '');
      case 'random':
        return this.generateRandomValue(type);
      case 'pattern':
        return this.generatePatternValue(strategy.pattern || '');
      default:
        return '';
    }
  }

  private generateRandomValue(type: string): string {
    switch (type) {
      case 'text':
        return `Random text ${Math.random().toString(36).substring(7)}`;
      case 'email':
        return `user${Math.random().toString(36).substring(7)}@example.com`;
      case 'number':
        return Math.floor(Math.random() * 100).toString();
      default:
        return `Random value ${Math.random().toString(36).substring(7)}`;
    }
  }

  private generatePatternValue(pattern: string): string {
    // Simple pattern replacement
    return pattern.replace(/\{random\}/g, Math.random().toString(36).substring(7));
  }

  private generateDateValue(strategy: FillStrategy): string {
    if (strategy.strategy === 'fixed' && strategy.value) {
      return String(strategy.value);
    }
    
    // Generate random date within last 30 days
    const randomDays = Math.floor(Math.random() * 30);
    const date = subDays(new Date(), randomDays);
    return format(date, 'yyyy-MM-dd');
  }

  private generateTimeValue(strategy: FillStrategy): string {
    if (strategy.strategy === 'fixed' && strategy.value) {
      return String(strategy.value);
    }
    
    // Generate random time
    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private selectOption(strategy: FillStrategy, options: string[]): string | null {
    if (options.length === 0) return null;
    
    switch (strategy.strategy) {
      case 'fixed':
        return String(strategy.value || options[0]);
      case 'random':
        return options[Math.floor(Math.random() * options.length)];
      default:
        return options[0];
    }
  }

  private selectMultipleOptions(strategy: FillStrategy, options: string[]): string[] {
    if (options.length === 0) return [];
    
    switch (strategy.strategy) {
      case 'fixed':
        return Array.isArray(strategy.value) ? strategy.value : [String(strategy.value || options[0])];
      case 'random':
        const count = Math.floor(Math.random() * Math.min(3, options.length)) + 1;
        return options.sort(() => 0.5 - Math.random()).slice(0, count);
      default:
        return [options[0]];
    }
  }

  private async submitForm(page: Page): Promise<void> {
    // Find and click submit button
    const submitButton = await page.$('input[type="submit"], button[type="submit"], [role="button"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      throw new Error('Submit button not found');
    }
  }

  private async waitForConfirmation(page: Page): Promise<void> {
    // Wait for confirmation page or success message
    try {
      // Wait for Vietnamese confirmation message
      await page.waitForSelector('text="Câu trả lời của bạn đã được ghi lại."', { timeout: 15000 });
      this.logger.info('Form submission confirmed: "Câu trả lời của bạn đã được ghi lại."');
    } catch {
      // Try alternative confirmation messages
      try {
        await page.waitForSelector('text="Your response has been recorded."', { timeout: 5000 });
        this.logger.info('Form submission confirmed: "Your response has been recorded."');
      } catch {
        // Try other common confirmation patterns
        try {
          await page.waitForSelector('[role="main"]:has-text("cảm ơn"), .freebirdFormviewerViewResponseConfirmationMessage, [jsname="r4nke"]', { timeout: 5000 });
          this.logger.info('Form submission confirmed: Thank you message detected');
        } catch {
          // Last resort: wait for URL change or page load
          await this.delay(3000);
          const currentUrl = page.url();
          if (currentUrl.includes('formResponse') || currentUrl.includes('thanks')) {
            this.logger.info('Form submission confirmed: URL indicates success');
          } else {
            this.logger.warn('Could not confirm form submission, but continuing...');
          }
        }
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error: any) {
        this.logger.warn('Failed to close browser', error);
      } finally {
        this.browser = null;
      }
    }
  }
}
