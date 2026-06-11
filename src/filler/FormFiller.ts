import { connect } from 'puppeteer-real-browser';
import { Logger } from '../utils/Logger';
import { ExecutionSettings } from '../utils/ConfigManager';
import {
  AnswerPlan,
  QuestionPlan,
  pickWeightedSingle,
  pickCheckboxSet,
} from '../utils/AnswerPlan';
import * as path from 'path';
import * as fs from 'fs';

export interface FillingProgress {
  currentRun: number;
  totalRuns: number;
  currentQuestion?: string;
  status: 'starting' | 'filling' | 'submitting' | 'completed' | 'error' | 'dry-run';
  message: string;
  successCount: number;
  errorCount: number;
}

/** Per-question, per-option tally of what was actually chosen across all runs. */
export type DistributionReport = Record<
  string,
  { question: string; counts: Record<string, number>; filled: number }
>;

export interface FillingResult {
  totalRuns: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ run: number; error: string; timestamp: string; screenshot?: string }>;
  duration: number;
  dryRun: boolean;
  distribution: DistributionReport;
  screenshots: string[];
}

export interface FillRunOptions {
  plan: AnswerPlan;
  execution: ExecutionSettings;
  /** When true, fills every page but never submits; captures a screenshot per run. */
  dryRun: boolean;
}

const CONTAINER_SELECTOR = '[role="listitem"]';

export class FormFiller {
  private logger: Logger;
  private browser: any = null;
  private artifactsDir: string;

  constructor() {
    this.logger = new Logger();
    this.artifactsDir = path.join(process.cwd(), 'logs', 'screenshots');
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  public async startFilling(
    options: FillRunOptions,
    progressCallback: (progress: FillingProgress) => void
  ): Promise<FillingResult> {
    const { plan, execution, dryRun } = options;
    const startTime = Date.now();
    // In dry-run we only ever do a single pass regardless of configured runs.
    const totalRuns = dryRun ? 1 : execution.runs;

    const result: FillingResult = {
      totalRuns,
      successCount: 0,
      errorCount: 0,
      errors: [],
      duration: 0,
      dryRun,
      distribution: this.initDistribution(plan),
      screenshots: [],
    };

    this.logger.info('Starting form filling', { runs: totalRuns, dryRun, headless: execution.headless });

    try {
      for (let run = 1; run <= totalRuns; run++) {
        progressCallback({
          currentRun: run,
          totalRuns,
          status: 'starting',
          message: dryRun ? 'Bắt đầu chạy thử (dry-run)...' : `Bắt đầu lần chạy ${run}/${totalRuns}`,
          successCount: result.successCount,
          errorCount: result.errorCount,
        });

        try {
          const shot = await this.fillSingleForm(plan, execution, dryRun, run, result, progressCallback);
          if (shot) result.screenshots.push(shot);
          result.successCount++;
          progressCallback({
            currentRun: run,
            totalRuns,
            status: dryRun ? 'dry-run' : 'completed',
            message: dryRun
              ? 'Chạy thử hoàn tất. Form CHƯA được gửi. Xem ảnh chụp để duyệt.'
              : `Lần chạy ${run} hoàn thành`,
            successCount: result.successCount,
            errorCount: result.errorCount,
          });

          if (!dryRun && run < totalRuns) {
            await this.delay(execution.delayBetweenRuns);
          }
        } catch (error: any) {
          result.errorCount++;
          const screenshot = await this.lastErrorShot;
          result.errors.push({
            run,
            error: error?.message || String(error),
            timestamp: new Date().toISOString(),
            screenshot,
          });
          if (screenshot) result.screenshots.push(screenshot);
          this.logger.error(`Run ${run} failed`, error);
          progressCallback({
            currentRun: run,
            totalRuns,
            status: 'error',
            message: `Lần chạy ${run} lỗi: ${error?.message || String(error)}`,
            successCount: result.successCount,
            errorCount: result.errorCount,
          });
        }
      }
    } finally {
      await this.cleanup();
      result.duration = Date.now() - startTime;
    }

    this.logger.info('Form filling completed', {
      successCount: result.successCount,
      errorCount: result.errorCount,
      dryRun,
    });
    return result;
  }

  private lastErrorShot: Promise<string | undefined> = Promise.resolve(undefined);

  private async fillSingleForm(
    plan: AnswerPlan,
    execution: ExecutionSettings,
    dryRun: boolean,
    runNumber: number,
    result: FillingResult,
    progressCallback: (progress: FillingProgress) => void
  ): Promise<string | undefined> {
    let page: any = null;

    try {
      if (!this.browser) {
        const connection = await connect({
          headless: dryRun ? false : execution.headless,
          turnstile: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          customConfig: {},
          connectOption: { defaultViewport: null },
        });
        this.browser = connection.browser;
        page = connection.page;
      } else {
        page = await this.browser.newPage();
      }

      progressCallback({
        currentRun: runNumber,
        totalRuns: result.totalRuns,
        status: dryRun ? 'dry-run' : 'filling',
        message: 'Đang mở form...',
        successCount: result.successCount,
        errorCount: result.errorCount,
      });

      await page.goto(plan.formUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.delay(800 + Math.random() * 1200);

      const pageCount = plan.questions.reduce((max, q) => Math.max(max, q.page || 1), 1);

      // Walk pages dynamically. We don't trust the scanned page index blindly because
      // branching forms can change which page is shown; instead we fill whatever
      // questions are visible, then advance until confirmation or no "Next" remains.
      let safetyPages = pageCount + 5;
      let logicalPage = 1;

      while (safetyPages-- > 0) {
        await this.waitForContainers(page);
        const pageQuestions = plan.questions.filter((q) => (q.page || 1) === logicalPage);
        await this.fillPage(page, pageQuestions, runNumber, result, dryRun, progressCallback);

        const hasNext = await this.hasNavButton(page, ['Tiếp', 'Next', 'Continue']);
        const hasSubmit = await this.hasNavButton(page, ['Gửi', 'Submit', 'Nộp']);

        if (dryRun) {
          // In dry-run, advance through pages (to fill them) but never submit.
          if (hasNext) {
            await this.clickNavButton(page, ['Tiếp', 'Next', 'Continue']);
            await this.delay(1000 + Math.random() * 600);
            logicalPage++;
            continue;
          }
          // Reached the last page: capture proof and stop without submitting.
          const shot = await this.capture(page, `dryrun-run${runNumber}`);
          this.logger.info('Dry-run reached final page without submitting', { screenshot: shot });
          return shot;
        }

        if (hasSubmit && !hasNext) {
          progressCallback({
            currentRun: runNumber,
            totalRuns: result.totalRuns,
            status: 'submitting',
            message: 'Đang gửi form...',
            successCount: result.successCount,
            errorCount: result.errorCount,
          });
          await this.clickNavButton(page, ['Gửi', 'Submit', 'Nộp']);
          await this.waitForConfirmation(page);
          return undefined;
        }

        if (hasNext) {
          await this.clickNavButton(page, ['Tiếp', 'Next', 'Continue']);
          await this.delay(1200 + Math.random() * 800);
          logicalPage++;
          continue;
        }

        throw new Error(`Không tìm thấy nút "Tiếp" hoặc "Gửi" ở trang ${logicalPage}`);
      }

      throw new Error('Vượt quá số trang tối đa khi điền form (có thể form bị rẽ nhánh bất thường)');
    } catch (err) {
      // Capture an error screenshot before bubbling up.
      if (page) {
        this.lastErrorShot = this.capture(page, `error-run${runNumber}`).catch(() => undefined);
        await this.lastErrorShot;
      }
      throw err;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch {
          /* ignore */
        }
      }
    }
  }

  private async fillPage(
    page: any,
    pageQuestions: QuestionPlan[],
    runNumber: number,
    result: FillingResult,
    dryRun: boolean,
    progressCallback: (progress: FillingProgress) => void
  ): Promise<void> {
    for (let i = 0; i < pageQuestions.length; i++) {
      const question = pageQuestions[i];
      if (question.type === 'file_upload' || question.type === 'unsupported') continue;

      // Match by heading text rather than blind index: Google Forms inserts a
      // section-header listitem (and description/image blocks) that would otherwise
      // shift positional mapping. Matching on the scanned question text is robust to that.
      const container = await this.findContainerForQuestion(page, question.question);
      if (!container) {
        if (question.required) {
          throw new Error(`Không tìm thấy ô câu hỏi bắt buộc: "${question.question}"`);
        }
        this.logger.warn(`Container not found for "${question.question}", skipping`);
        continue;
      }

      progressCallback({
        currentRun: runNumber,
        totalRuns: result.totalRuns,
        status: dryRun ? 'dry-run' : 'filling',
        currentQuestion: question.question,
        message: `Đang điền: ${question.question}`,
        successCount: result.successCount,
        errorCount: result.errorCount,
      });

      try {
        await this.fillQuestion(page, container, question, result.distribution);
      } catch (error: any) {
        this.logger.warn(`Failed to fill "${question.question}"`, {
          error: error?.message || String(error),
        });
        if (question.required) throw error;
      }
      await this.delay(250 + Math.random() * 500);
    }
  }

  /**
   * Finds the question container whose heading matches `questionText`.
   * Returns the closest [role="listitem"] ancestor that actually holds an input control,
   * skipping section-header / description listitems that share the same role.
   */
  private async findContainerForQuestion(page: any, questionText: string): Promise<any | null> {
    const handle = await page.evaluateHandle((wanted: string) => {
      const norm = (s: string) => (s || '').replace(/\s+/g, ' ').replace(/\*$/, '').trim();
      const target = norm(wanted);
      const items = Array.from(
        (globalThis as any).document.querySelectorAll('[role="listitem"]')
      ) as any[];
      const hasControl = (item: any) =>
        item.querySelector(
          'input:not([type="hidden"]), textarea, select, [role="radio"], [role="checkbox"], [role="listbox"]'
        );
      // Pass 1: exact heading match with a real control.
      for (const item of items) {
        const heading = item.querySelector('[role="heading"], .M7eMe');
        if (!heading) continue;
        if (norm(heading.textContent || '') === target && hasControl(item)) return item;
      }
      // Pass 2: tolerant match (heading contains the scanned text or vice versa).
      for (const item of items) {
        const heading = item.querySelector('[role="heading"], .M7eMe');
        if (!heading) continue;
        const h = norm(heading.textContent || '');
        if (!h || !hasControl(item)) continue;
        if (h.includes(target) || target.includes(h)) return item;
      }
      return null;
    }, questionText);

    const element = handle.asElement();
    if (!element) {
      await handle.dispose();
      return null;
    }
    return element;
  }

  private async fillQuestion(
    page: any,
    container: any,
    question: QuestionPlan,
    dist: DistributionReport
  ): Promise<void> {
    switch (question.type) {
      case 'text':
      case 'paragraph':
      case 'date':
      case 'time': {
        const value = pickWeightedSingle(question.answers);
        if (value) {
          await this.fillText(container, value);
          this.tally(dist, question.id, value);
        }
        break;
      }
      case 'multiple_choice':
      case 'linear_scale': {
        const value = pickWeightedSingle(question.answers);
        if (value) {
          await this.fillRadio(container, value);
          this.tally(dist, question.id, value);
        }
        break;
      }
      case 'checkbox': {
        const values = pickCheckboxSet(
          question.answers,
          question.minSelections ?? 0,
          question.maxSelections ?? (question.options?.length || 0)
        );
        await this.fillCheckboxes(container, values);
        for (const v of values) this.tally(dist, question.id, v);
        break;
      }
      case 'dropdown': {
        const value = pickWeightedSingle(question.answers);
        if (value) {
          await this.fillDropdown(page, container, value);
          this.tally(dist, question.id, value);
        }
        break;
      }
      default:
        this.logger.warn(`Unsupported question type: ${question.type}`);
    }
  }

  private async fillText(container: any, value: string): Promise<void> {
    if (!value) return;
    const input = await container.$('input:not([type="hidden"]), textarea');
    if (!input) throw new Error('Không tìm thấy ô nhập text');
    await input.click({ clickCount: 3 });
    await input.type(value, { delay: 15 + Math.random() * 35 });
  }

  private async fillRadio(container: any, value: string): Promise<void> {
    if (await this.clickChoiceByLabel(container, value, '[role="radio"]')) return;
    const inputs = await container.$$('input[type="radio"]');
    for (const input of inputs) {
      const optVal = await input.evaluate((el: any) => el.getAttribute('value') || '');
      if (optVal === value) {
        await input.click();
        return;
      }
    }
    throw new Error(`Không tìm thấy lựa chọn: ${value}`);
  }

  private async fillCheckboxes(container: any, values: string[]): Promise<void> {
    for (const value of values) {
      if (await this.clickChoiceByLabel(container, value, '[role="checkbox"]')) continue;
      const inputs = await container.$$('input[type="checkbox"]');
      let done = false;
      for (const input of inputs) {
        const optVal = await input.evaluate((el: any) => el.getAttribute('value') || '');
        if (optVal === value) {
          await input.click();
          done = true;
          break;
        }
      }
      if (!done) this.logger.warn(`Checkbox option not found: ${value}`);
    }
  }

  private async clickChoiceByLabel(container: any, value: string, role: string): Promise<boolean> {
    const choices = await container.$$(role);
    for (const choice of choices) {
      const label = await choice.evaluate((el: any) =>
        (el.getAttribute('aria-label') || el.getAttribute('data-value') || el.textContent || '').trim()
      );
      if (label === value) {
        await choice.click();
        return true;
      }
    }
    return false;
  }

  private async fillDropdown(page: any, container: any, value: string): Promise<void> {
    const select = await container.$('select');
    if (select) {
      await select.select(value);
      return;
    }
    const trigger = await container.$('[role="listbox"], [role="option"]');
    if (trigger) {
      await trigger.click();
      await this.delay(500);
      const options = await page.$$('[role="option"]');
      for (const opt of options) {
        const label = await opt.evaluate((el: any) =>
          (el.getAttribute('data-value') || el.textContent || '').trim()
        );
        if (label === value) {
          await opt.click();
          return;
        }
      }
    }
    throw new Error(`Không tìm thấy lựa chọn dropdown: ${value}`);
  }

  // ---- Distribution tracking ----

  private initDistribution(plan: AnswerPlan): DistributionReport {
    const dist: DistributionReport = {};
    for (const q of plan.questions) {
      dist[q.id] = { question: q.question, counts: {}, filled: 0 };
    }
    return dist;
  }

  private tally(dist: DistributionReport, questionId: string, value: string): void {
    const entry = dist[questionId];
    if (!entry) return;
    entry.counts[value] = (entry.counts[value] || 0) + 1;
    entry.filled += 1;
  }

  // ---- Navigation, submit & confirm ----

  private async waitForContainers(page: any): Promise<void> {
    try {
      await page.waitForSelector(CONTAINER_SELECTOR, { timeout: 10000 });
    } catch {
      this.logger.warn('No question containers appeared within timeout');
    }
  }

  private async hasNavButton(page: any, labels: string[]): Promise<boolean> {
    return page.evaluate((wanted: string[]) => {
      const buttons = Array.from(
        (globalThis as any).document.querySelectorAll(
          '[role="button"], button[type="submit"], input[type="submit"]'
        )
      ) as any[];
      return buttons.some((btn) => {
        const text = (btn.textContent || btn.value || '').trim();
        return wanted.some((l) => text === l || text.startsWith(l));
      });
    }, labels);
  }

  private async clickNavButton(page: any, labels: string[]): Promise<boolean> {
    return page.evaluate((wanted: string[]) => {
      const buttons = Array.from(
        (globalThis as any).document.querySelectorAll(
          '[role="button"], button[type="submit"], input[type="submit"]'
        )
      ) as any[];
      for (const btn of buttons) {
        const text = (btn.textContent || btn.value || '').trim();
        if (wanted.some((l) => text === l || text.startsWith(l))) {
          btn.click();
          return true;
        }
      }
      return false;
    }, labels);
  }

  private async waitForConfirmation(page: any): Promise<void> {
    const confirmations = [
      'Câu trả lời của bạn đã được ghi lại',
      'Your response has been recorded',
      'cảm ơn',
      'Thank you',
    ];
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      const found = await page.evaluate((needles: string[]) => {
        const body = ((globalThis as any).document.body.textContent || '').toLowerCase();
        return needles.some((n) => body.includes(n.toLowerCase()));
      }, confirmations);
      if (found) {
        this.logger.info('Form submission confirmed');
        return;
      }
      const url = page.url();
      if (url.includes('formResponse') || url.includes('thanks')) {
        this.logger.info('Form submission confirmed via URL');
        return;
      }
      await this.delay(500);
    }
    this.logger.warn('Could not confirm submission within timeout');
  }

  private async capture(page: any, label: string): Promise<string | undefined> {
    try {
      const file = path.join(
        this.artifactsDir,
        `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
      );
      await page.screenshot({ path: file, fullPage: true });
      return file;
    } catch (error: any) {
      this.logger.warn('Failed to capture screenshot', error);
      return undefined;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
