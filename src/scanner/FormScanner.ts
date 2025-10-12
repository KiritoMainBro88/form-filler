// import fetch from 'node-fetch';
// import { JSDOM } from 'jsdom';
import { chromium, Browser } from 'playwright';
import { Logger } from '../utils/Logger';

export interface Question {
  id: string;
  type: 'text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'linear_scale' | 'multiple_choice_grid' | 'checkbox_grid' | 'date' | 'time' | 'file_upload';
  question: string;
  required: boolean;
  options?: string[];
}

export interface ScanResult {
  formUrl: string;
  formTitle: string;
  questions: Question[];
  scanMethod: 'api' | 'playwright' | 'combined';
  timestamp: string;
}

export class FormScanner {
  private logger: Logger;
  private browser: Browser | null = null;

  constructor() {
    this.logger = new Logger();
  }

  public async scanForm(formUrl: string): Promise<ScanResult> {
    this.logger.info('Starting form scan', { formUrl });

    try {
      // For now, always use Playwright scan for better accuracy
      // TODO: Improve API scan to match Playwright accuracy
      this.logger.info('Using Playwright scan for better accuracy');
      return await this.scanWithPlaywright(formUrl);
    } catch (error: any) {
      this.logger.error('Form scan failed', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  // Temporarily disabled - using Playwright scan only
  /*
  private async _scanWithAPI(formUrl: string): Promise<ScanResult | null> {
    try {
      this.logger.info('Attempting API scan', { formUrl });
      
      const response = await fetch(formUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000,
      });

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Extract form title
      const formTitle = document.querySelector('title')?.textContent || 'Untitled Form';
      
      // Extract questions
      const questions: Question[] = [];
      
      // Look for different question types
      const questionElements = document.querySelectorAll('[data-params*="entry."]');
      questionElements.forEach((element) => {
        const question = this.extractQuestionFromElement(element);
        if (question) {
          questions.push(question);
        }
      });

      // Fallback: look for form elements directly
      if (questions.length === 0) {
        const formElements = document.querySelectorAll('input, select, textarea');
        formElements.forEach((element) => {
          const question = this.extractQuestionFromFormElement(element);
          if (question) {
            questions.push(question);
          }
        });
      }

      this.logger.info('API scan completed', { questionCount: questions.length });
      
      return {
        formUrl,
        formTitle,
        questions,
        scanMethod: 'api',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      this.logger.warn('API scan failed, will try Playwright', { error: error?.message || String(error) });
      return null;
    }
  }
  */

  private async scanWithPlaywright(formUrl: string): Promise<ScanResult> {
    try {
      this.logger.info('Starting Playwright scan', { formUrl });

      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await this.browser.newPage();
      
      // Set user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      // Navigate to form
      await page.goto(formUrl, { waitUntil: 'networkidle' });
      
      // Wait for form to load
      await page.waitForTimeout(3000);
      
      // Check if we're on the right page (not login page)
      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
        this.logger.warn('Redirected to login page, form may require authentication');
        throw new Error('Form requires authentication or is not publicly accessible');
      }
      
      // Wait for form content to load
      try {
        await page.waitForSelector('[data-params], .freebirdFormviewerViewItemsItemItem, input, select, textarea', { timeout: 10000 });
      } catch (error) {
        this.logger.warn('Form content not found, trying to continue anyway');
      }
      
      // Extract form title
      const formTitle = await page.title() || 'Untitled Form';
      this.logger.info('Form title extracted', { formTitle, currentUrl });
      
      // Collect all questions from all pages
      const allQuestions: any[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      
      while (hasNextPage) {
        this.logger.info(`Scanning page ${currentPage}`);
        
        // Extract questions from current page
        const isDevelopment = process.env.NODE_ENV === 'development';
        const pageQuestions = await page.evaluate((isDev) => {
        const questions: any[] = [];
        
        // Enhanced Google Forms detection based on real form analysis
        // Multiple strategies to catch different form layouts and versions
        const questionSelectors = [
          // Primary Google Forms selectors (2024) - from real form analysis
          '.Qr7Oae[role="listitem"]',  // Main question container
          '.freebirdFormviewerViewItemsItemItem',
          '.freebirdFormviewerViewItemsQuestionItem',
          '[data-params]',
          
          // Alternative selectors for different form versions
          '[jsname="YPqjbf"]',
          '.M7eMe',
          '[data-item-id]',
          
          // Generic form element containers
          '[role="listitem"]',
          '.form-item',
          '.question-item',
          
          // Direct form controls
          'input[type="text"], input[type="email"], input[type="number"], input[type="date"], input[type="time"]',
          'textarea',
          'select',
          '[role="radiogroup"]',
          '[role="checkbox"]'
        ];
        
        let questionElements: NodeListOf<Element> | null = null;
        
        // Try each selector strategy until we find elements
        for (const selector of questionSelectors) {
          try {
            const elements = (globalThis as any).document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
              questionElements = elements;
              if (isDev) {
                console.log(`Found ${elements.length} elements using selector: ${selector}`);
              }
              break;
            }
          } catch (e) {
            // Continue to next selector if this one fails
            continue;
          }
        }
        
        if (!questionElements || questionElements.length === 0) {
          // Last resort: find any elements with form controls
          questionElements = (globalThis as any).document.querySelectorAll('input, select, textarea, [role="radiogroup"], [role="checkbox"]');
        }
        
        // Enhanced filtering based on successful project patterns
        const validQuestionElements = Array.from(questionElements || []).filter((element: any) => {
          const text = element.textContent || '';
          const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"], iframe');
          const hasM7eMe = element.querySelector('.M7eMe'); // Primary question indicator from real forms
          
          // Must have form controls OR M7eMe element (question text)
          if (!hasInput && !hasM7eMe) return false;
          
          // Skip if element is too small (likely UI elements)
          if (text.length < 3) return false;
          
          // Skip navigation and UI elements - be more specific to avoid filtering real questions
          const skipPatterns = [
            'Tiếp', 'Next', 'Quay lại', 'Back', 'Submit', 'Gửi',
            'Email or phone', 'Forgot email', 'Create account', 'Sign in',
            'Không bao giờ gửi mật khẩu', 'Xóa hết câu trả lời',
            'Powered by', 'Terms of Service', 'Privacy Policy',
            'Biểu thị câu hỏi bắt buộc'
          ];
          
          // Check skip patterns but be more intelligent about it
          for (const pattern of skipPatterns) {
            if (text.includes(pattern)) {
              // If the pattern appears at the beginning or as a standalone element, skip
              // But if it's part of a longer question text, don't skip
              const patternIndex = text.indexOf(pattern);
              const beforePattern = text.substring(0, patternIndex).trim();
              const afterPattern = text.substring(patternIndex + pattern.length).trim();
              
              // Skip if pattern is at the beginning with minimal text before/after
              if (patternIndex < 10 && (beforePattern.length < 5 && afterPattern.length < 20)) {
                return false;
              }
              
              // Skip if it's clearly a UI element (short text with pattern)
              if (text.length < 50 && patternIndex < 20) {
                return false;
              }
            }
          }
          
          // If has M7eMe element, it's likely a question
          if (hasM7eMe) return true;
          
          // Check if element looks like a real question
          const questionIndicators = [
            '?', 'gì', 'nào', 'thế nào', 'Bạn', 'Anh', 'Chị', 'Ông', 'Bà',
            'Công ty', 'Tên', 'Email', 'Địa chỉ', 'Số điện thoại', 'Tuổi',
            'Giới tính', 'Nghề nghiệp', 'Thu nhập', 'Chi tiêu', 'Độ tuổi',
            'Có', 'Không', 'Đồng ý', 'Không đồng ý', 'Bình thường',
            'Nam', 'Nữ', 'Học sinh', 'Sinh viên', 'Nhân viên', 'Kinh doanh',
            'Enter', 'What', 'Please', 'Tell', 'About', 'Experience',
            'T/F', 'Which', 'Paste', 'How to', 'True', 'False'
          ];
          
          const hasQuestionIndicator = questionIndicators.some(indicator => 
            text.toLowerCase().includes(indicator.toLowerCase())
          );
          
          // Accept if it has question indicators OR if it's a form control with reasonable text
          return hasQuestionIndicator || (text.length > 5 && text.length < 500);
        });
        
        if (isDev) {
          console.log('Valid question elements after filtering:', validQuestionElements.length);
        }
        
        if (validQuestionElements.length === 0) {
          // Fallback: look for any form elements
          const formElements = (globalThis as any).document.querySelectorAll('input, select, textarea, [role="radiogroup"], [role="checkbox"]');
          formElements.forEach((element: any, index: number) => {
            const question = extractQuestionFromElement(element, index);
            if (question) {
              questions.push(question);
            }
          });
        } else {
          // Use Google Forms specific elements
          validQuestionElements.forEach((element: any, index: number) => {
            const question = extractQuestionFromGoogleForm(element, index, isDev);
            if (question && question.question && question.question !== `Question ${index + 1}`) {
              questions.push(question);
            }
          });
        }
        
        return questions;
        
        function extractQuestionFromElement(element: any, index: number): any {
          const tagName = element.tagName.toLowerCase();
          const type = element.type || tagName;
          const name = element.name || `question_${index}`;
          const required = element.required || element.hasAttribute('required');
          
          // Try to find question text
          let questionText = '';
          const label = element.closest('label') || element.previousElementSibling;
          if (label) {
            questionText = label.textContent?.trim() || '';
          }
          
          if (!questionText) {
            questionText = `Question ${index + 1}`;
          }
          
          return {
            id: name,
            type: mapInputTypeToQuestionType(type),
            question: questionText,
            required: required,
            options: extractOptions(element)
          };
        }
        
        function extractQuestionFromGoogleForm(element: any, index: number, isDev: boolean): any {
          // Extract question text with better logic
          let questionText = '';
          let questionType = 'text';
          let options: string[] = [];
          let required = false;
          
          // Enhanced text extraction based on real form analysis
          const textExtractionStrategies = [
            // Strategy 1: Look for specific question title elements (from real form)
            () => {
              const titleSelectors = [
                '.M7eMe',  // Primary question text selector from real form
                '.freebirdFormviewerViewItemsQuestionItemTitle',
                '.freebirdFormviewerViewItemsItemItemTitle',
                '[jsname="YPqjbf"]',
                '.Qr7Oae',
                'h1, h2, h3, h4, h5, h6',
                '.question-title',
                '[data-question-title]',
                'label'
              ];
              
              for (const selector of titleSelectors) {
                const titleElement = element.querySelector(selector);
                if (titleElement && titleElement.textContent) {
                  const text = titleElement.textContent.trim();
                  if (text && text.length > 3 && text.length < 500) {
                    return text;
                  }
                }
              }
              return null;
            },
            
            // Strategy 2: Extract from all text nodes, prioritizing longer text
            () => {
              const allTextElements = element.querySelectorAll('*');
              const possibleQuestions: string[] = [];
              
              allTextElements.forEach((el: any) => {
                if (el.textContent && el.children.length === 0) { // Only leaf nodes
                  const text = el.textContent.trim();
                  if (text && 
                      text.length > 5 && 
                      text.length < 500 &&
                      !text.match(/^[A-Za-z\s]+$/) && // Not just letters
                      !text.includes('Xóa hết câu trả lời') &&
                      !text.includes('Không bao giờ gửi mật khẩu') &&
                      !text.includes('Tiếp') &&
                      !text.includes('Submit') &&
                      !text.includes('Gửi') &&
                      !text.includes('Required') &&
                      !text.includes('Bắt buộc') &&
                      !text.includes('Option') &&
                      !text.includes('Tùy chọn') &&
                      !text.includes('Quay lại') &&
                      !text.includes('Back')) {
                    possibleQuestions.push(text);
                  }
                }
              });
              
              if (possibleQuestions.length > 0) {
                // Return the longest text that looks like a question
                return possibleQuestions.reduce((longest, current) => 
                  current.length > longest.length ? current : longest
                );
              }
              return null;
            },
            
            // Strategy 3: Use element's direct text content
            () => {
              const text = element.textContent?.trim();
              if (text && text.length > 3 && text.length < 500) {
                return text;
              }
              return null;
            }
          ];
          
          // Try each strategy until we find valid question text
          for (const strategy of textExtractionStrategies) {
            const extractedText = strategy();
            if (extractedText) {
              questionText = extractedText;
              if (isDev) {
                console.log(`Found question text using strategy: "${questionText}"`);
              }
              break;
            }
          }
          
          // Fallback: try specific selectors
          if (!questionText) {
            const questionSelectors = [
              '.freebirdFormviewerViewItemsQuestionItemTitle',
              '.freebirdFormviewerViewItemsItemItemTitle', 
              '.M7eMe',
              '[jsname="YPqjbf"]',
              '.Qr7Oae',
              'h1, h2, h3, h4, h5, h6',
              '.question-title',
              '[data-question-title]'
            ];
            
            for (const selector of questionSelectors) {
              const textElement = element.querySelector(selector);
              if (textElement && textElement.textContent) {
                const text = textElement.textContent.trim();
                if (isDev) {
                  console.log(`Selector ${selector} found text: "${text}"`);
                }
                if (text && 
                    !text.includes('Xóa hết câu trả lời') &&
                    !text.includes('Không bao giờ gửi mật khẩu') &&
                    !text.includes('Tiếp') &&
                    !text.includes('Submit') &&
                    !text.includes('Gửi') &&
                    text.length > 5) {
                  questionText = text;
                  if (isDev) {
                    console.log(`Using question text: "${questionText}"`);
                  }
                  break;
                }
              }
            }
          }
          
          if (!questionText) {
            questionText = `Question ${index + 1}`;
          }
          
          // Detect question type and extract options (enhanced for real forms)
          const inputElement = element.querySelector('input, select, textarea');
          const radioButtons = element.querySelectorAll('input[type="radio"]');
          const checkboxes = element.querySelectorAll('input[type="checkbox"]');
          const selectElement = element.querySelector('select');
          const textareaElement = element.querySelector('textarea');
          const videoElement = element.querySelector('iframe[src*="youtube"]');
          const radiogroup = element.querySelector('[role="radiogroup"]');
          const checkboxGroup = element.querySelector('[role="checkbox"]');
          
          // Check if required
          required = element.querySelector('[aria-required="true"]') !== null || 
                   element.querySelector('*[required]') !== null ||
                   questionText.includes('*');
          
          // Determine question type and extract options
          if (videoElement) {
            questionType = 'video';
          } else if (radioButtons.length > 0 || radiogroup) {
            questionType = 'multiple_choice';
            // Extract options from radio buttons or radiogroup
            if (radioButtons.length > 0) {
              radioButtons.forEach((radio: any) => {
                const label = radio.nextElementSibling || radio.parentElement.querySelector('label');
                if (label && label.textContent) {
                  const text = label.textContent.trim();
                  if (text && !options.includes(text)) {
                    options.push(text);
                  }
                }
              });
            } else if (radiogroup) {
              // Extract from radiogroup structure (from real form)
              const radioOptions = radiogroup.querySelectorAll('[role="radio"]');
              radioOptions.forEach((radio: any) => {
                const text = radio.getAttribute('aria-label') || radio.textContent?.trim();
                if (text && !options.includes(text)) {
                  options.push(text);
                }
              });
            }
          } else if (checkboxes.length > 0 || checkboxGroup) {
            questionType = 'checkbox';
            // Extract options from checkboxes
            if (checkboxes.length > 0) {
              checkboxes.forEach((checkbox: any) => {
                const label = checkbox.nextElementSibling || checkbox.parentElement.querySelector('label');
                if (label && label.textContent) {
                  const text = label.textContent.trim();
                  if (text && !options.includes(text)) {
                    options.push(text);
                  }
                }
              });
            } else if (checkboxGroup) {
              // Extract from checkbox group structure (from real form)
              const checkboxOptions = checkboxGroup.querySelectorAll('[role="checkbox"]');
              checkboxOptions.forEach((checkbox: any) => {
                const text = checkbox.getAttribute('aria-label') || checkbox.textContent?.trim();
                if (text && !options.includes(text)) {
                  options.push(text);
                }
              });
            }
          } else if (selectElement) {
            questionType = 'dropdown';
            const optionElements = selectElement.querySelectorAll('option');
            optionElements.forEach((option: any) => {
              if (option.textContent && option.textContent.trim()) {
                options.push(option.textContent.trim());
              }
            });
          } else if (textareaElement) {
            questionType = 'paragraph';
          } else if (inputElement) {
            const inputType = inputElement.type || inputElement.tagName.toLowerCase();
            questionType = mapInputTypeToQuestionType(inputType);
          }
          
          // Generate entry ID if not found
          const dataParams = element.getAttribute('data-params');
          let entryId = `entry.${index + 1}`;
          if (dataParams) {
            const entryIdMatch = dataParams.match(/entry\\.(\\d+)/);
            if (entryIdMatch) {
              entryId = `entry.${entryIdMatch[1]}`;
            }
          }
          
          return {
            id: entryId,
            type: questionType,
            question: questionText || `Question ${index + 1}`,
            required: required,
            options: options.length > 0 ? options : undefined
          };
        }
        
        function mapInputTypeToQuestionType(inputType: string): string {
          switch (inputType) {
            case 'text': return 'text';
            case 'email': return 'text';
            case 'url': return 'text';
            case 'tel': return 'text';
            case 'textarea': return 'paragraph';
            case 'radio': return 'multiple_choice';
            case 'checkbox': return 'checkbox';
            case 'select': return 'dropdown';
            case 'date': return 'date';
            case 'time': return 'time';
            case 'file': return 'file_upload';
            case 'video': return 'video';
            default: return 'text';
          }
        }
        
        function extractOptions(element: any): string[] | undefined {
          if (element.type === 'radio' || element.type === 'checkbox') {
            const options: string[] = [];
            const container = element.closest('[role="radiogroup"], [role="group"]') || element.parentElement;
            if (container) {
              const optionElements = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
              optionElements.forEach((option: any) => {
                const label = option.nextElementSibling || option.parentElement.querySelector('label');
                if (label) {
                  const text = label.textContent?.trim();
                  if (text) options.push(text);
                }
              });
            }
            return options.length > 0 ? options : undefined;
          }
          return undefined;
        }
      }, isDevelopment);
      
      // Add questions from current page
      allQuestions.push(...pageQuestions);
      
      // Check if there's a next page
      const nextButton = await page.$('[role="button"]:has-text("Tiếp"), [role="button"]:has-text("Next"), .freebirdFormviewerViewNavigationNextButton, [jsname="OCpkoe"]');
      
      if (nextButton) {
        try {
          await nextButton.click();
          await page.waitForTimeout(2000); // Wait for page to load
          currentPage++;
        } catch (error) {
          this.logger.info('No more pages or error navigating', { error });
          hasNextPage = false;
        }
      } else {
        hasNextPage = false;
      }
      
      // Safety check to prevent infinite loop
      if (currentPage > 10) {
        this.logger.warn('Reached maximum page limit (10), stopping scan');
        hasNextPage = false;
      }
    }
    
    this.logger.info('Playwright scan completed', { 
      questionCount: allQuestions.length, 
      pagesScanned: currentPage 
    });
    
    return {
      formUrl,
      formTitle,
      questions: allQuestions,
      scanMethod: 'playwright',
      timestamp: new Date().toISOString(),
    };
    } catch (error: any) {
      this.logger.error('Playwright scan failed', error);
      throw error;
    }
  }


  // Temporarily disabled - using Playwright scan only
  /*
  private extractQuestionFromElement(element: Element): Question | null {
    // Implementation for extracting question from DOM element
    // This is a simplified version - would need more sophisticated parsing
    try {
      const dataParams = element.getAttribute('data-params');
      if (!dataParams) return null;

      // Extract entry ID from data-params
      const entryIdMatch = dataParams.match(/entry\.(\d+)/);
      if (!entryIdMatch) return null;

      const entryId = `entry.${entryIdMatch[1]}`;
      
      // Determine question type based on element
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute('type');
      
      let questionType: Question['type'] = 'text';
      if (tagName === 'input') {
        if (type === 'radio') questionType = 'multiple_choice';
        else if (type === 'checkbox') questionType = 'checkbox';
        else if (type === 'date') questionType = 'date';
        else if (type === 'time') questionType = 'time';
        else if (type === 'file') questionType = 'file_upload';
        else questionType = 'text';
      } else if (tagName === 'select') {
        questionType = 'dropdown';
      } else if (tagName === 'textarea') {
        questionType = 'paragraph';
      }

      // Extract question text (simplified)
      const listItem = element.closest('[role="listitem"]');
      const heading = listItem?.querySelector('[role="heading"]');
      const questionText = heading?.textContent || 
                          element.closest('.freebirdFormviewerViewItemsItemItem')?.querySelector('.freebirdFormviewerViewItemsItemItemTitle')?.textContent ||
                          'Question';

      return {
        id: entryId,
        type: questionType,
        question: questionText,
        required: element.getAttribute('aria-required') === 'true',
      };
    } catch (error: any) {
      this.logger.warn('Failed to extract question from element', { error: error?.message || String(error) });
      return null;
    }
  }
  */

  // Temporarily disabled - using Playwright scan only
  /*
  private extractQuestionFromFormElement(element: Element): Question | null {
    // Implementation for extracting question from form element
    // This is a fallback method
    try {
      const name = element.getAttribute('name');
      if (!name || !name.startsWith('entry.')) return null;

      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute('type');
      
      let questionType: Question['type'] = 'text';
      if (tagName === 'input') {
        if (type === 'radio') questionType = 'multiple_choice';
        else if (type === 'checkbox') questionType = 'checkbox';
        else if (type === 'date') questionType = 'date';
        else if (type === 'time') questionType = 'time';
        else if (type === 'file') questionType = 'file_upload';
        else questionType = 'text';
      } else if (tagName === 'select') questionType = 'dropdown';
      else if (tagName === 'textarea') questionType = 'paragraph';

      return {
        id: name,
        type: questionType,
        question: 'Question',
        required: element.hasAttribute('required'),
      };
    } catch (error: any) {
      this.logger.warn('Failed to extract question from form element', { error: error?.message || String(error) });
      return null;
    }
  }
  */

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