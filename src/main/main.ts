import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { FormScanner } from '../scanner/FormScanner';
import { FormFiller } from '../filler/FormFiller';
import { ConfigManager } from '../utils/ConfigManager';
import { Logger } from '../utils/Logger';

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
      // Try different ports that Vite might use
      const ports = [3000, 3001, 3002, 3003, 3004, 3005];
      let loaded = false;
      
      for (const port of ports) {
        try {
          await this.mainWindow.loadURL(`http://localhost:${port}`);
          loaded = true;
          this.logger.info(`Successfully loaded renderer from port ${port}`);
          break;
        } catch (error: any) {
          this.logger.warn(`Failed to load from port ${port}: ${error?.message || String(error)}`);
          // Continue to next port
        }
      }
      
      if (!loaded) {
        this.logger.error('Could not load renderer from any port');
        this.mainWindow.loadURL('data:text/html,<h1>Error: Could not load renderer</h1>');
      }
      
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../../renderer/src/renderer/index.html'));
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
        this.logger.info('Starting form scan', { formUrl });
        const result = await this.formScanner.scanForm(formUrl);
        this.logger.info('Form scan completed', { questionCount: result.questions.length });
        return result;
      } catch (error) {
        this.logger.error('Form scan failed', error);
        throw error;
      }
    });

    // Save config
    ipcMain.handle('save-config', async (_event, config: any) => {
      try {
        const savedPath = await this.configManager.saveConfig(config);
        this.logger.info('Config saved', { path: savedPath });
        return savedPath;
      } catch (error) {
        this.logger.error('Failed to save config', error);
        throw error;
      }
    });

    // Load config
    ipcMain.handle('load-config', async (_event, configName: string) => {
      try {
        const config = await this.configManager.loadConfig(configName);
        this.logger.info('Config loaded', { configName });
        return config;
      } catch (error) {
        this.logger.error('Failed to load config', error);
        throw error;
      }
    });

    // List configs
    ipcMain.handle('list-configs', async () => {
      try {
        const configs = await this.configManager.listConfigs();
        return configs;
      } catch (error) {
        this.logger.error('Failed to list configs', error);
        throw error;
      }
    });

    // Start filling
    ipcMain.handle('start-filling', async (_event, config: any) => {
      try {
        this.logger.info('Starting form filling', { runs: config.executionSettings.runs });
        
        // Send progress updates to renderer
        const progressCallback = (progress: any) => {
          this.mainWindow?.webContents.send('filling-progress', progress);
        };

        const result = await this.formFiller.startFilling(config, progressCallback);
        this.logger.info('Form filling completed', result);
        return result;
      } catch (error) {
        this.logger.error('Form filling failed', error);
        throw error;
      }
    });

    // Select file dialog
    ipcMain.handle('select-file', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow!, {
          properties: ['openFile'],
          filters: [
            { name: 'All Files', extensions: ['*'] },
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
            { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
          ],
        });
        return result;
      } catch (error) {
        this.logger.error('Failed to select file', error);
        throw error;
      }
    });
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
