import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from './Logger';
import { AnswerPlan } from './AnswerPlan';

export interface ExecutionSettings {
  runs: number;
  delayBetweenRuns: number;
  headless: boolean;
}

/** A saved config bundles an answer plan with its execution settings. */
export interface SavedConfig {
  name: string;
  savedAt: string;
  plan: AnswerPlan;
  execution: ExecutionSettings;
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

  public async savePlanConfig(
    name: string,
    plan: AnswerPlan,
    execution: ExecutionSettings
  ): Promise<string> {
    const safeName = this.sanitizeName(name) || this.generateConfigName(plan.formTitle);
    const filePath = path.join(this.configsDir, `${safeName}.json`);
    const payload: SavedConfig = {
      name: safeName,
      savedAt: new Date().toISOString(),
      plan,
      execution,
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    this.logger.info('Config saved', { filePath });
    return safeName;
  }

  public async loadPlanConfig(name: string): Promise<SavedConfig> {
    const filePath = path.join(this.configsDir, `${name}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    if (!data || data.trim().length === 0) {
      throw new Error('Config file is empty');
    }
    const config = JSON.parse(data) as SavedConfig;
    if (!config || typeof config !== 'object' || !config.plan) {
      throw new Error('Invalid config format');
    }
    this.logger.info('Config loaded', { name });
    return config;
  }

  public async listConfigs(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.configsDir);
      return files
        .filter((file) => file.endsWith('.json'))
        .map((file) => path.basename(file, '.json'));
    } catch (error) {
      this.logger.error('Failed to list configs', error);
      return [];
    }
  }

  public async deleteConfig(name: string): Promise<void> {
    const filePath = path.join(this.configsDir, `${name}.json`);
    await fs.unlink(filePath);
    this.logger.info('Config deleted', { name });
  }

  private sanitizeName(name: string): string {
    return (name || '').replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '_').trim();
  }

  private generateConfigName(formTitle: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitized = (formTitle || 'form').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    return `${sanitized}_${timestamp}`;
  }

  public getDefaultExecutionSettings(): ExecutionSettings {
    return { runs: 1, delayBetweenRuns: 2000, headless: false };
  }
}
