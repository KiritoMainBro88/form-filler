import { connect } from 'puppeteer-real-browser';
import { Logger } from '../utils/Logger';

export type QuestionType =
  | 'text'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkbox'
  | 'dropdown'
  | 'linear_scale'
  | 'date'
  | 'time'
  | 'file_upload'
  | 'unsupported';

export interface Question {
  /** Submission id, e.g. "entry.123456789". */
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  /** 1-based section/page the question lives on. */
  page: number;
}

export interface ScanResult {
  formUrl: string;
  formTitle: string;
  questions: Question[];
  pageCount: number;
  scanMethod: 'fb-public-load-data' | 'dom-fallback';
  timestamp: string;
}

/**
 * Google Forms question type codes found in FB_PUBLIC_LOAD_DATA_.
 * Reverse-engineered; see scanner tests for coverage.
 */
const TYPE_CODE: Record<number, QuestionType> = {
  0: 'text',
  1: 'paragraph',
  2: 'multiple_choice',
  3: 'dropdown',
  4: 'checkbox',
  5: 'linear_scale',
  9: 'date',
  10: 'time',
  13: 'file_upload',
};

const PAGE_BREAK_CODE = 8;

export class FormScanner {
  private logger: Logger;
  private browser: any = null;

  constructor() {
    this.logger = new Logger();
  }

  public async scanForm(formUrl: string): Promise<ScanResult> {
    this.logger.info('Starting form scan', { formUrl });

    let page: any = null;
    try {
      const connection = await connect({
        headless: true,
        turnstile: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        customConfig: {},
        connectOption: { defaultViewport: null },
      });
      this.browser = connection.browser;
      page = connection.page;

      await page.goto(formUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      const currentUrl = page.url();
      if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
        throw new Error('Form requires authentication or is not publicly accessible');
      }

      const loadData = await page.evaluate(() => (globalThis as any).FB_PUBLIC_LOAD_DATA_ ?? null);

      if (loadData) {
        const result = this.parseLoadData(loadData, formUrl);
        this.logger.info('Form scan completed (FB_PUBLIC_LOAD_DATA_)', {
          questionCount: result.questions.length,
          pageCount: result.pageCount,
        });
        return result;
      }

      this.logger.warn('FB_PUBLIC_LOAD_DATA_ not found, falling back to DOM scan');
      const fallback = await this.domFallbackScan(page, formUrl);
      this.logger.info('Form scan completed (DOM fallback)', {
        questionCount: fallback.questions.length,
      });
      return fallback;
    } catch (error: any) {
      this.logger.error('Form scan failed', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Parses the embedded FB_PUBLIC_LOAD_DATA_ structure.
   * Layout (indices reverse-engineered):
   *   data[1][1]    -> array of items (questions, page breaks, description blocks)
   *   data[1][8]    -> form title
   *   item[0]       -> item id
   *   item[1]       -> question text
   *   item[3]       -> type code
   *   item[4][0][0] -> submission entry id
   *   item[4][0][1] -> options [[label, ...], ...]
   *   item[4][0][2] -> required flag (1/0)
   */
  private parseLoadData(data: any, formUrl: string): ScanResult {
    const formTitle =
      (Array.isArray(data?.[1]) && typeof data[1][8] === 'string' && data[1][8]) ||
      (Array.isArray(data?.[3]) ? data[3] : 'Untitled Form') ||
      'Untitled Form';

    const items: any[] = (Array.isArray(data?.[1]) && Array.isArray(data[1][1]) && data[1][1]) || [];
    const questions: Question[] = [];
    let pageNumber = 1;

    for (const item of items) {
      if (!Array.isArray(item)) continue;
      const typeCode = item[3];

      if (typeCode === PAGE_BREAK_CODE) {
        pageNumber += 1;
        continue;
      }

      const entries = item[4];
      // Items without an entries array are description/image/video blocks, not questions.
      if (!Array.isArray(entries) || entries.length === 0) continue;

      const type = TYPE_CODE[typeCode];
      if (!type) continue; // grids and other unsupported types are skipped intentionally.

      const firstEntry = entries[0] || [];
      const submitId = firstEntry[0];
      const id = submitId != null ? `entry.${submitId}` : `entry.unknown_${questions.length}`;
      const question = (typeof item[1] === 'string' && item[1].trim()) || 'Untitled question';
      const required = firstEntry[2] === 1;

      let options: string[] | undefined;
      const rawOptions = firstEntry[1];
      if (Array.isArray(rawOptions)) {
        const mapped = rawOptions
          .map((o: any) => (Array.isArray(o) ? o[0] : o))
          .filter((o: any) => typeof o === 'string' && o.length > 0);
        if (mapped.length > 0) options = mapped;
      }

      questions.push({ id, type, question, required, options, page: pageNumber });
    }

    return {
      formUrl,
      formTitle: String(formTitle),
      questions,
      pageCount: pageNumber,
      scanMethod: 'fb-public-load-data',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fallback used only when FB_PUBLIC_LOAD_DATA_ is unavailable (e.g. mock/test forms).
   * Reads visible question containers on the current page only.
   */
  private async domFallbackScan(page: any, formUrl: string): Promise<ScanResult> {
    const formTitle = (await page.title()) || 'Untitled Form';
    const questions: Question[] = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const containers = Array.from(doc.querySelectorAll('[role="listitem"]')) as any[];
      const out: any[] = [];

      containers.forEach((container: any) => {
        const heading = container.querySelector('[role="heading"], .M7eMe');
        const title = heading && heading.textContent ? heading.textContent.trim() : '';
        if (!title) return;

        const named = container.querySelector('[name^="entry."]');
        const id = named ? named.getAttribute('name') : `entry.dom_${out.length}`;

        const textarea = container.querySelector('textarea');
        const radios = container.querySelectorAll('input[type="radio"]');
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const select = container.querySelector('select');
        const dateInput = container.querySelector('input[type="date"]');
        const timeInput = container.querySelector('input[type="time"]');

        let type = 'text';
        if (dateInput) type = 'date';
        else if (timeInput) type = 'time';
        else if (textarea) type = 'paragraph';
        else if (select) type = 'dropdown';
        else if (checkboxes.length > 0) type = 'checkbox';
        else if (radios.length > 0) type = 'multiple_choice';

        let options: string[] | undefined;
        if (type === 'multiple_choice' || type === 'checkbox') {
          const opts: string[] = [];
          container
            .querySelectorAll('input[type="radio"], input[type="checkbox"]')
            .forEach((input: any) => {
              const v = input.getAttribute('value');
              if (v) opts.push(v);
            });
          if (opts.length > 0) options = opts;
        } else if (type === 'dropdown' && select) {
          const opts: string[] = [];
          select.querySelectorAll('option').forEach((o: any) => {
            const t = (o.textContent || '').trim();
            if (t) opts.push(t);
          });
          if (opts.length > 0) options = opts;
        }

        const required =
          !!container.querySelector('[required], [aria-required="true"]') ||
          /\*/.test(heading.textContent || '');

        out.push({ id, type, question: title, required, options, page: 1 });
      });

      return out;
    });

    return {
      formUrl,
      formTitle,
      questions,
      pageCount: 1,
      scanMethod: 'dom-fallback',
      timestamp: new Date().toISOString(),
    };
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
