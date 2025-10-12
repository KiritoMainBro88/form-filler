import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './Logger';

export interface FillStrategy {
  strategy: 'random' | 'fixed' | 'sequential' | 'pattern' | 'skip';
  value?: string | number;
  pattern?: string;
  selectedOptions?: string[];
}

export interface ExecutionSettings {
  runs: number;
  delayBetweenRuns: number;
  headless: boolean;
}

export interface FormConfig {
  formUrl: string;
  formTitle: string;
  savedAt: string;
  fillStrategies: Record<string, FillStrategy>;
  executionSettings: ExecutionSettings;
}

export class ConfigManager {
  private configsDir: string;
  private logger: Logger;

  constructor() {
    this.configsDir = path.join(process.cwd(), 'configs');
    this.logger = new Logger();
    this.ensureConfigsDir();
  }

  private async ensureConfigsDir(): Promise<void> {
    try {
      await fs.access(this.configsDir);
    } catch {
      await fs.mkdir(this.configsDir, { recursive: true });
    }
  }

  public async saveConfig(config: FormConfig, configName?: string): Promise<string> {
    try {
      const fileName = configName || this.generateConfigName(config.formTitle);
      const filePath = path.join(this.configsDir, `${fileName}.json`);
      
      // Add timestamp if not present
      if (!config.savedAt) {
        config.savedAt = new Date().toISOString();
      }

      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
      this.logger.info('Config saved successfully', { filePath, configName: fileName });
      
      return filePath;
    } catch (error) {
      this.logger.error('Failed to save config', error);
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  public async loadConfig(configName: string): Promise<FormConfig> {
    try {
      const filePath = path.join(this.configsDir, `${configName}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      
      // Validate JSON before parsing
      if (!data || data.trim().length === 0) {
        throw new Error('Config file is empty');
      }
      
      const config = JSON.parse(data) as FormConfig;
      
      // Basic validation
      if (!config || typeof config !== 'object') {
        throw new Error('Invalid config format');
      }
      
      this.logger.info('Config loaded successfully', { configName });
      return config;
    } catch (error) {
      this.logger.error('Failed to load config', error);
      throw new Error(`Failed to load config: ${error}`);
    }
  }

  public async listConfigs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.configsDir);
      const configFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
      
      this.logger.info('Configs listed', { count: configFiles.length });
      return configFiles;
    } catch (error) {
      this.logger.error('Failed to list configs', error);
      throw new Error(`Failed to list configs: ${error}`);
    }
  }

  public async deleteConfig(configName: string): Promise<void> {
    try {
      const filePath = path.join(this.configsDir, `${configName}.json`);
      await fs.unlink(filePath);
      
      this.logger.info('Config deleted successfully', { configName });
    } catch (error) {
      this.logger.error('Failed to delete config', error);
      throw new Error(`Failed to delete config: ${error}`);
    }
  }

  public async exportConfig(configName: string, exportPath: string): Promise<void> {
    try {
      const config = await this.loadConfig(configName);
      await fs.writeFile(exportPath, JSON.stringify(config, null, 2), 'utf-8');
      
      this.logger.info('Config exported successfully', { configName, exportPath });
    } catch (error) {
      this.logger.error('Failed to export config', error);
      throw new Error(`Failed to export config: ${error}`);
    }
  }

  public async importConfig(importPath: string, configName?: string): Promise<string> {
    try {
      const data = await fs.readFile(importPath, 'utf-8');
      const config = JSON.parse(data) as FormConfig;
      
      const fileName = configName || this.generateConfigName(config.formTitle);
      const filePath = path.join(this.configsDir, `${fileName}.json`);
      
      await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
      
      this.logger.info('Config imported successfully', { importPath, configName: fileName });
      return fileName;
    } catch (error) {
      this.logger.error('Failed to import config', error);
      throw new Error(`Failed to import config: ${error}`);
    }
  }

  private generateConfigName(formTitle: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedTitle = formTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return `${sanitizedTitle}_${timestamp}`;
  }

  public getDefaultExecutionSettings(): ExecutionSettings {
    return {
      runs: 1,
      delayBetweenRuns: 2000,
      headless: false,
    };
  }

  public getDefaultFillStrategy(): FillStrategy {
    return {
      strategy: 'random',
    };
  }
}
