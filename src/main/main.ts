import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FormScanner } from '../scanner/FormScanner';
import { FormFiller } from '../filler/FormFiller';
import { ConfigManager } from '../utils/ConfigManager';
import { Logger } from '../utils/Logger';
import { buildPlanTemplate, validatePlan } from '../utils/AnswerPlan';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private formScanner: FormScanner;
  private formFiller: FormFiller;
  private configManager: ConfigManager;
  private logger: Logger;

  constructor() {
    this.formScanner = new FormScanner();
    this.formFiller = new FormFiller();
    this.configManager = new ConfigManager();
    this.logger = new Logger();
    
    this.setupIpcHandlers();
  }

  private async createWindow(): Promise<void> {
    try {
      this.mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
        },
        titleBarStyle: 'default',
        show: false,
      });

    // Load the renderer
    if (process.env.NODE_ENV === 'development') {
      const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      try {
        await this.mainWindow.loadURL(devUrl);
        this.logger.info(`Loaded renderer from ${devUrl}`);
      } catch (error: any) {
        this.logger.error(`Failed to load renderer from ${devUrl}`, error);
        this.mainWindow.loadURL('data:text/html,<h1>Error: Could not load renderer. Is the Vite dev server running?</h1>');
      }
      this.mainWindow.webContents.openDevTools();
    } else {
      await this.mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

      this.mainWindow.once('ready-to-show', () => {
        this.mainWindow?.show();
      });

      this.mainWindow.on('closed', () => {
        this.mainWindow = null;
      });
    } catch (error: any) {
      this.logger.error('Failed to create window', error);
      throw error;
    }
  }

  private setupIpcHandlers(): void {
    // Scan form
    ipcMain.handle('scan-form', async (_event, formUrl: string) => {
      try {
        this.assertValidFormUrl(formUrl);
        this.logger.info('Starting form scan', { formUrl });
        const result = await this.formScanner.scanForm(formUrl);
        this.logger.info('Form scan completed', { questionCount: result.questions.length });
        return result;
      } catch (error) {
        this.logger.error('Form scan failed', error);
        throw error;
      }
    });

    // Build an editable answer-plan template from a scan result.
    ipcMain.handle('build-plan', async (_event, scanResult: any) => {
      try {
        const plan = buildPlanTemplate(scanResult.questions, {
          formUrl: scanResult.formUrl,
          formTitle: scanResult.formTitle,
          pageCount: scanResult.pageCount ?? 1,
        });
        return plan;
      } catch (error) {
        this.logger.error('Failed to build plan', error);
        throw error;
      }
    });

    // Validate a plan (strict). Returns { valid, issues }.
    ipcMain.handle('validate-plan', async (_event, plan: any) => {
      return validatePlan(plan);
    });

    // Export plan to a JSON file chosen by the user.
    ipcMain.handle('export-plan', async (_event, plan: any) => {
      const { canceled, filePath } = await dialog.showSaveDialog(this.mainWindow!, {
        title: 'Xuất kế hoạch trả lời (JSON)',
        defaultPath: `answer-plan-${Date.now()}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (canceled || !filePath) return null;
      await fs.writeFile(filePath, JSON.stringify(plan, null, 2), 'utf-8');
      this.logger.info('Plan exported', { filePath });
      return filePath;
    });

    // Import a plan JSON file chosen by the user. Returns { plan, validation }.
    ipcMain.handle('import-plan', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow!, {
        title: 'Nhập kế hoạch trả lời (JSON)',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (canceled || filePaths.length === 0) return null;
      const raw = await fs.readFile(filePaths[0], 'utf-8');
      let plan: any;
      try {
        plan = JSON.parse(raw);
      } catch {
        throw new Error('File JSON không hợp lệ (parse lỗi).');
      }
      const validation = validatePlan(plan);
      return { plan, validation };
    });

    // Save / load / list plan configs (stored as JSON under configs/).
    ipcMain.handle('save-config', async (_event, name: string, plan: any, execution: any) => {
      return this.configManager.savePlanConfig(name, plan, execution);
    });
    ipcMain.handle('load-config', async (_event, name: string) => {
      return this.configManager.loadPlanConfig(name);
    });
    ipcMain.handle('list-configs', async () => {
      return this.configManager.listConfigs();
    });

    // Start filling (dry-run or real). Validates plan again before running.
    ipcMain.handle('start-filling', async (_event, payload: any) => {
      try {
        const { plan, execution, dryRun } = payload || {};
        this.assertValidFormUrl(plan?.formUrl);

        const validation = validatePlan(plan);
        if (!validation.valid) {
          const firstErrors = validation.issues
            .filter((i) => i.severity === 'error')
            .slice(0, 5)
            .map((i) => `• ${i.question}: ${i.message}`)
            .join('\n');
          throw new Error(`Kế hoạch chưa hợp lệ, không thể chạy:\n${firstErrors}`);
        }

        this.logger.info('Starting form filling', { runs: execution?.runs, dryRun });
        const progressCallback = (progress: any) => {
          this.mainWindow?.webContents.send('filling-progress', progress);
        };

        const result = await this.formFiller.startFilling(
          { plan, execution, dryRun: !!dryRun },
          progressCallback
        );
        this.logger.info('Form filling completed', {
          successCount: result.successCount,
          errorCount: result.errorCount,
          dryRun: result.dryRun,
        });
        return result;
      } catch (error) {
        this.logger.error('Form filling failed', error);
        throw error;
      }
    });

    // Open a saved screenshot in the OS image viewer.
    ipcMain.handle('open-screenshot', async (_event, filePath: string) => {
      await shell.openPath(filePath);
    });
  }

  /** Validates that a string is a public Google Forms URL. Throws otherwise. */
  private assertValidFormUrl(formUrl: unknown): void {
    if (typeof formUrl !== 'string' || formUrl.trim().length === 0) {
      throw new Error('Form URL is required');
    }
    let parsed: URL;
    try {
      parsed = new URL(formUrl);
    } catch {
      throw new Error('Form URL is not a valid URL');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Form URL must use HTTPS');
    }
    const isGoogleForm =
      parsed.hostname === 'docs.google.com' && parsed.pathname.includes('/forms/');
    if (!isGoogleForm) {
      throw new Error('Only public Google Forms URLs (docs.google.com/forms/...) are supported');
    }
  }

  public async initialize(): Promise<void> {
    await app.whenReady();
    await this.createWindow();

    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createWindow();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }
}

// Initialize the main process
const mainProcess = new MainProcess();
mainProcess.initialize().catch((error) => {
  console.error('Failed to initialize main process:', error);
  process.exit(1);
});
