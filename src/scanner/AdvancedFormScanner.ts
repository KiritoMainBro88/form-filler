import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { chromium, Browser } from 'playwright';
import { Logger } from '../utils/Logger';

export interface AdvancedQuestion {
  id: string;
  type: 'text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'linear_scale' | 'multiple_choice_grid' | 'checkbox_grid' | 'date' | 'time' | 'file_upload';
  question: string;
  description?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  position: {
    x: number;
    y: number;
    order: number;
  };
  confidence: number; // 0-1 confidence score
}

export interface AdvancedScanResult {
  formUrl: string;
  formTitle: string;
  formDescription?: string;
  questions: AdvancedQuestion[];
  formMetadata: {
    totalQuestions: number;
    requiredQuestions: number;
    estimatedTime: number; // in seconds
    difficulty: 'easy' | 'medium' | 'hard';
    categories: string[];
  };
  scanMethod: 'api' | 'playwright' | 'combined' | 'advanced';
  scanQuality: {
    accuracy: number;
    completeness: number;
    confidence: number;
  };
  timestamp: string;
}

export class AdvancedFormScanner {
  private logger: Logger;
  private browser: Browser | null = null;
  private questionPatterns: Map<string, RegExp> = new Map();
  private typeIndicators: Map<string, string[]> = new Map();

  constructor() {
    this.logger = new Logger();
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // Question ID patterns
    this.questionPatterns.set('entry', /entry\.(\d+)/);
    this.questionPatterns.set('dataParams', /data-params="([^"]*entry\.\d+[^"]*)"/);
    this.questionPatterns.set('name', /name="(entry\.\d+)"/);
    
    // Type indicators
    this.typeIndicators.set('multiple_choice', ['radio', 'radiogroup', 'choice']);
    this.typeIndicators.set('checkbox', ['checkbox', 'checkboxes']);
    this.typeIndicators.set('dropdown', ['select', 'dropdown', 'menu']);
    this.typeIndicators.set('linear_scale', ['scale', 'rating', 'slider']);
    this.typeIndicators.set('date', ['date', 'calendar']);
    this.typeIndicators.set('time', ['time', 'clock']);
    this.typeIndicators.set('file_upload', ['file', 'upload', 'attachment']);
  }

  public async scanForm(formUrl: string): Promise<AdvancedScanResult> {
    this.logger.info('Starting advanced form scan', { formUrl });

    try {
      // Try multiple scanning methods and combine results
      const [apiResult, playwrightResult] = await Promise.allSettled([
        this.scanWithAPI(formUrl),
        this.scanWithPlaywright(formUrl)
      ]);

      const results: AdvancedScanResult[] = [];
      
      if (apiResult.status === 'fulfilled' && apiResult.value) {
        results.push(apiResult.value);
      }
      
      if (playwrightResult.status === 'fulfilled' && playwrightResult.value) {
        results.push(playwrightResult.value);
      }

      if (results.length === 0) {
        throw new Error('All scanning methods failed');
      }

      // Combine and enhance results
      const combinedResult = this.combineAndEnhanceResults(results, formUrl);
      
      this.logger.info('Advanced form scan completed', { 
        questionCount: combinedResult.questions.length,
        accuracy: combinedResult.scanQuality.accuracy 
      });

      return combinedResult;
    } catch (error: any) {
      this.logger.error('Advanced form scan failed', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async scanWithAPI(formUrl: string): Promise<AdvancedScanResult | null> {
    try {
      this.logger.info('Starting API scan with enhanced detection', { formUrl });
      
      const response = await fetch(formUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Extract enhanced form metadata
      const formTitle = this.extractFormTitle(document);
      const formDescription = this.extractFormDescription(document);
      
      // Extract questions with advanced detection
      const questions = this.extractQuestionsAdvanced(document);
      
      // Calculate form metadata
      const formMetadata = this.calculateFormMetadata(questions);
      
      // Calculate scan quality
      const scanQuality = this.calculateScanQuality(questions, 'api');

      this.logger.info('Enhanced API scan completed', { 
        questionCount: questions.length,
        accuracy: scanQuality.accuracy 
      });
      
      return {
        formUrl,
        formTitle,
        formDescription,
        questions,
        formMetadata,
        scanMethod: 'api',
        scanQuality,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.warn('Enhanced API scan failed', { error: error?.message || String(error) });
      return null;
    }
  }

  private async scanWithPlaywright(formUrl: string): Promise<AdvancedScanResult | null> {
    try {
      this.logger.info('Starting enhanced Playwright scan', { formUrl });

      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      
      const page = await this.browser.newPage();
      
      // Enhanced stealth settings
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // Set viewport and other stealth settings
      await page.setViewportSize({ width: 1366, height: 768 });
      
      // Override navigator properties
      await page.addInitScript(() => {
        Object.defineProperty((globalThis as any).navigator, 'webdriver', {
          get: () => undefined,
        });
        Object.defineProperty((globalThis as any).navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty((globalThis as any).navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });
      
      // Navigate to form
      await page.goto(formUrl, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Wait for form to fully load
      await page.waitForTimeout(3000);
      
      // Extract enhanced form metadata
      const formTitle = await page.title() || 'Untitled Form';
      const formDescription = await this.extractFormDescriptionPlaywright(page);
      
      // Extract questions with advanced detection
      const questions = await this.extractQuestionsAdvancedPlaywright(page);
      
      // Calculate form metadata
      const formMetadata = this.calculateFormMetadata(questions);
      
      // Calculate scan quality
      const scanQuality = this.calculateScanQuality(questions, 'playwright');

      this.logger.info('Enhanced Playwright scan completed', { 
        questionCount: questions.length,
        accuracy: scanQuality.accuracy 
      });
      
      return {
        formUrl,
        formTitle,
        formDescription,
        questions,
        formMetadata,
        scanMethod: 'playwright',
        scanQuality,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.error('Enhanced Playwright scan failed', error);
      return null;
    }
  }

  private extractFormTitle(document: Document): string {
    // Try multiple selectors for form title
    const selectors = [
      'h1',
      '.freebirdFormviewerViewHeaderTitle',
      '[data-params*="title"]',
      'title'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return 'Untitled Form';
  }

  private extractFormDescription(document: Document): string | undefined {
    const selectors = [
      '.freebirdFormviewerViewHeaderDescription',
      '[data-params*="description"]',
      '.form-description'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    return undefined;
  }

  private async extractFormDescriptionPlaywright(page: any): Promise<string | undefined> {
    const selectors = [
      '.freebirdFormviewerViewHeaderDescription',
      '[data-params*="description"]',
      '.form-description'
    ];

    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text?.trim()) {
            return text.trim();
          }
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return undefined;
  }

  private extractQuestionsAdvanced(document: Document): AdvancedQuestion[] {
    const questions: AdvancedQuestion[] = [];
    let questionOrder = 0;

    // Multiple detection strategies
    const strategies = [
      () => this.detectByDataParams(document, questionOrder),
      () => this.detectByFormElements(document, questionOrder),
      () => this.detectByStructure(document, questionOrder),
      () => this.detectByClasses(document, questionOrder)
    ];

    for (const strategy of strategies) {
      try {
        const detectedQuestions = strategy();
        questions.push(...detectedQuestions);
        questionOrder += detectedQuestions.length;
      } catch (error) {
        this.logger.warn('Question detection strategy failed', { error });
      }
    }

    // Remove duplicates and enhance
    return this.deduplicateAndEnhanceQuestions(questions);
  }

  private async extractQuestionsAdvancedPlaywright(page: any): Promise<AdvancedQuestion[]> {
    return await page.evaluate(() => {
      const questions: any[] = [];
      let questionOrder = 0;

      // Enhanced detection in browser context
      const formElements = (globalThis as any).document.querySelectorAll(
        'input, select, textarea, [role="radiogroup"], [role="checkbox"], [data-params*="entry"]'
      );

      formElements.forEach((element: any, index: number) => {
        const question = extractQuestionFromElement(element, questionOrder + index);
        if (question) {
          questions.push(question);
        }
      });

      return questions;

      function extractQuestionFromElement(element: any, order: number): any {
        try {
          // Extract entry ID
          const entryId = extractEntryId(element);
          if (!entryId) return null;

          // Determine question type with confidence
          const { type, confidence } = determineQuestionType(element);

          // Extract question text
          const questionText = extractQuestionText(element);

          // Extract options if applicable
          const options = extractOptions(element, type);

          // Check if required
          const required = element.hasAttribute('required') || 
                          element.getAttribute('aria-required') === 'true';

          // Get position
          const rect = element.getBoundingClientRect();

          return {
            id: entryId,
            type,
            question: questionText,
            required,
            options,
            position: {
              x: rect.left,
              y: rect.top,
              order
            },
            confidence
          };
        } catch (error) {
          return null;
        }
      }

      function extractEntryId(element: any): string | null {
        // Try multiple methods to extract entry ID
        const name = element.getAttribute('name');
        if (name && name.startsWith('entry.')) {
          return name;
        }

        const dataParams = element.getAttribute('data-params');
        if (dataParams) {
          const match = dataParams.match(/entry\.(\d+)/);
          if (match) {
            return `entry.${match[1]}`;
          }
        }

        return null;
      }

      function determineQuestionType(element: any): { type: string; confidence: number } {
        const tagName = element.tagName.toLowerCase();
        const type = element.getAttribute('type');
        const role = element.getAttribute('role');

        // High confidence detections
        if (tagName === 'input') {
          if (type === 'radio') return { type: 'multiple_choice', confidence: 0.95 };
          if (type === 'checkbox') return { type: 'checkbox', confidence: 0.95 };
          if (type === 'date') return { type: 'date', confidence: 0.95 };
          if (type === 'time') return { type: 'time', confidence: 0.95 };
          if (type === 'file') return { type: 'file_upload', confidence: 0.95 };
          return { type: 'text', confidence: 0.9 };
        }

        if (tagName === 'select') return { type: 'dropdown', confidence: 0.95 };
        if (tagName === 'textarea') return { type: 'paragraph', confidence: 0.95 };

        // Role-based detection
        if (role === 'radiogroup') return { type: 'multiple_choice', confidence: 0.85 };
        if (role === 'checkbox') return { type: 'checkbox', confidence: 0.85 };

        // Default fallback
        return { type: 'text', confidence: 0.5 };
      }

      function extractQuestionText(element: any): string {
        // Try to find associated label or question text
        const label = element.closest('label') || 
                     (globalThis as any).document.querySelector(`label[for="${element.id}"]`);
        
        if (label && label.textContent) {
          return label.textContent.trim();
        }

        // Look for nearby text elements
        const parent = element.closest('[data-params]') || element.parentElement;
        if (parent) {
          const textElement = parent.querySelector('span, div, p');
          if (textElement && textElement.textContent) {
            return textElement.textContent.trim();
          }
        }

        return 'Question';
      }

      function extractOptions(element: any, type: string): string[] {
        if (type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown') {
          const options: string[] = [];
          
          // For radio/checkbox groups
          const group = element.closest('[role="radiogroup"], [role="checkbox"]');
          if (group) {
            const optionElements = group.querySelectorAll('input, option');
            optionElements.forEach((option: any) => {
              const text = option.textContent || option.getAttribute('value');
              if (text) options.push(text.trim());
            });
          }

          // For select dropdowns
          if (element.tagName.toLowerCase() === 'select') {
            const optionElements = element.querySelectorAll('option');
            optionElements.forEach((option: any) => {
              if (option.textContent) {
                options.push(option.textContent.trim());
              }
            });
          }

          return options;
        }

        return [];
      }
    });
  }

  private detectByDataParams(document: Document, startOrder: number): AdvancedQuestion[] {
    const questions: AdvancedQuestion[] = [];
    const elements = document.querySelectorAll('[data-params*="entry"]');
    
    elements.forEach((element, index) => {
      const question = this.extractQuestionFromElement(element, startOrder + index);
      if (question) {
        questions.push(question);
      }
    });

    return questions;
  }

  private detectByFormElements(document: Document, startOrder: number): AdvancedQuestion[] {
    const questions: AdvancedQuestion[] = [];
    const elements = document.querySelectorAll('input, select, textarea');
    
    elements.forEach((element, index) => {
      const question = this.extractQuestionFromElement(element, startOrder + index);
      if (question) {
        questions.push(question);
      }
    });

    return questions;
  }

  private detectByStructure(document: Document, startOrder: number): AdvancedQuestion[] {
    const questions: AdvancedQuestion[] = [];
    const containers = document.querySelectorAll('.freebirdFormviewerViewItemsItemItem, [role="listitem"]');
    
    containers.forEach((container, index) => {
      const question = this.extractQuestionFromContainer(container, startOrder + index);
      if (question) {
        questions.push(question);
      }
    });

    return questions;
  }

  private detectByClasses(document: Document, startOrder: number): AdvancedQuestion[] {
    const questions: AdvancedQuestion[] = [];
    const selectors = [
      '.freebirdFormviewerViewItemsItemItem',
      '.freebirdFormviewerViewItemsQuestionItem',
      '[data-params]'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const question = this.extractQuestionFromElement(element, startOrder + index);
        if (question) {
          questions.push(question);
        }
      });
    });

    return questions;
  }

  private extractQuestionFromElement(element: Element, order: number): AdvancedQuestion | null {
    try {
      const entryId = this.extractEntryId(element);
      if (!entryId) return null;

      const { type, confidence } = this.determineQuestionType(element);
      const questionText = this.extractQuestionText(element);
      const options = this.extractOptions(element, type);
      const required = this.isRequired(element);
      const position = this.getPosition(element);

      return {
        id: entryId,
        type,
        question: questionText,
        required,
        options,
        position: {
          ...position,
          order
        },
        confidence
      };
    } catch (error) {
      this.logger.warn('Failed to extract question from element', { error });
      return null;
    }
  }

  private extractQuestionFromContainer(container: Element, order: number): AdvancedQuestion | null {
    try {
      // Find the main input element in the container
      const inputElement = container.querySelector('input, select, textarea');
      if (!inputElement) return null;

      return this.extractQuestionFromElement(inputElement, order);
    } catch (error) {
      this.logger.warn('Failed to extract question from container', { error });
      return null;
    }
  }

  private extractEntryId(element: Element): string | null {
    // Try multiple methods to extract entry ID
    const name = element.getAttribute('name');
    if (name && name.startsWith('entry.')) {
      return name;
    }

    const dataParams = element.getAttribute('data-params');
    if (dataParams) {
      const match = dataParams.match(/entry\.(\d+)/);
      if (match) {
        return `entry.${match[1]}`;
      }
    }

    return null;
  }

  private determineQuestionType(element: Element): { type: AdvancedQuestion['type']; confidence: number } {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const role = element.getAttribute('role');

    // High confidence detections
    if (tagName === 'input') {
      if (type === 'radio') return { type: 'multiple_choice', confidence: 0.95 };
      if (type === 'checkbox') return { type: 'checkbox', confidence: 0.95 };
      if (type === 'date') return { type: 'date', confidence: 0.95 };
      if (type === 'time') return { type: 'time', confidence: 0.95 };
      if (type === 'file') return { type: 'file_upload', confidence: 0.95 };
      return { type: 'text', confidence: 0.9 };
    }

    if (tagName === 'select') return { type: 'dropdown', confidence: 0.95 };
    if (tagName === 'textarea') return { type: 'paragraph', confidence: 0.95 };

    // Role-based detection
    if (role === 'radiogroup') return { type: 'multiple_choice', confidence: 0.85 };
    if (role === 'checkbox') return { type: 'checkbox', confidence: 0.85 };

    // Default fallback
    return { type: 'text', confidence: 0.5 };
  }

  private extractQuestionText(element: Element): string {
    // Try to find associated label or question text
    const label = element.closest('label') || 
                 element.ownerDocument.querySelector(`label[for="${element.id}"]`);
    
    if (label && label.textContent) {
      return label.textContent.trim();
    }

    // Look for nearby text elements
    const parent = element.closest('[data-params]') || element.parentElement;
    if (parent) {
      const textElement = parent.querySelector('span, div, p');
      if (textElement && textElement.textContent) {
        return textElement.textContent.trim();
      }
    }

    return 'Question';
  }

  private extractOptions(element: Element, type: string): string[] {
    if (type === 'multiple_choice' || type === 'checkbox' || type === 'dropdown') {
      const options: string[] = [];
      
      // For radio/checkbox groups
      const group = element.closest('[role="radiogroup"], [role="checkbox"]');
      if (group) {
        const optionElements = group.querySelectorAll('input, option');
        optionElements.forEach(option => {
          const text = option.textContent || option.getAttribute('value');
          if (text) options.push(text.trim());
        });
      }

      // For select dropdowns
      if (element.tagName.toLowerCase() === 'select') {
        const optionElements = element.querySelectorAll('option');
        optionElements.forEach(option => {
          if (option.textContent) {
            options.push(option.textContent.trim());
          }
        });
      }

      return options;
    }

    return [];
  }

  private isRequired(element: Element): boolean {
    return element.hasAttribute('required') || 
           element.getAttribute('aria-required') === 'true';
  }

  private getPosition(_element: Element): { x: number; y: number } {
    // For DOM elements, we can't get actual position without rendering
    // Return placeholder values
    return { x: 0, y: 0 };
  }

  private deduplicateAndEnhanceQuestions(questions: AdvancedQuestion[]): AdvancedQuestion[] {
    const uniqueQuestions = new Map<string, AdvancedQuestion>();

    questions.forEach(question => {
      const existing = uniqueQuestions.get(question.id);
      if (!existing || question.confidence > existing.confidence) {
        uniqueQuestions.set(question.id, question);
      }
    });

    return Array.from(uniqueQuestions.values()).sort((a, b) => a.position.order - b.position.order);
  }

  private calculateFormMetadata(questions: AdvancedQuestion[]): AdvancedScanResult['formMetadata'] {
    const totalQuestions = questions.length;
    const requiredQuestions = questions.filter(q => q.required).length;
    
    // Estimate time based on question types
    const estimatedTime = questions.reduce((total, question) => {
      const timeMap: Record<string, number> = {
        'text': 5,
        'paragraph': 15,
        'multiple_choice': 3,
        'checkbox': 5,
        'dropdown': 3,
        'linear_scale': 2,
        'date': 5,
        'time': 5,
        'file_upload': 10
      };
      return total + (timeMap[question.type] || 5);
    }, 0);

    // Determine difficulty
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (totalQuestions > 20 || requiredQuestions > 10) {
      difficulty = 'hard';
    } else if (totalQuestions > 10 || requiredQuestions > 5) {
      difficulty = 'medium';
    }

    // Extract categories from question types
    const categories = [...new Set(questions.map(q => q.type))];

    return {
      totalQuestions,
      requiredQuestions,
      estimatedTime,
      difficulty,
      categories
    };
  }

  private calculateScanQuality(questions: AdvancedQuestion[], _method: string): AdvancedScanResult['scanQuality'] {
    if (questions.length === 0) {
      return { accuracy: 0, completeness: 0, confidence: 0 };
    }

    const avgConfidence = questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length;
    const highConfidenceQuestions = questions.filter(q => q.confidence > 0.8).length;
    const completeness = questions.length > 0 ? 1 : 0;

    return {
      accuracy: avgConfidence,
      completeness,
      confidence: highConfidenceQuestions / questions.length
    };
  }

  private combineAndEnhanceResults(results: AdvancedScanResult[], formUrl: string): AdvancedScanResult {
    if (results.length === 1) {
      return results[0];
    }

    // Combine questions from all results
    const allQuestions = new Map<string, AdvancedQuestion>();
    
    results.forEach(result => {
      result.questions.forEach(question => {
        const existing = allQuestions.get(question.id);
        if (!existing || question.confidence > existing.confidence) {
          allQuestions.set(question.id, question);
        }
      });
    });

    const combinedQuestions = Array.from(allQuestions.values())
      .sort((a, b) => a.position.order - b.position.order);

    // Use the best result as base
    const bestResult = results.reduce((best, current) => 
      current.scanQuality.accuracy > best.scanQuality.accuracy ? current : best
    );

    return {
      ...bestResult,
      formUrl,
      questions: combinedQuestions,
      formMetadata: this.calculateFormMetadata(combinedQuestions),
      scanMethod: 'advanced',
      scanQuality: this.calculateScanQuality(combinedQuestions, 'combined'),
      timestamp: new Date().toISOString()
    };
  }

  private async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
