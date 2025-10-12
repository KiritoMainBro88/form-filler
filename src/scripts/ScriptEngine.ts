import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { FormConfiguration } from '../types';
import { FormTemplate } from '../templates/FormTemplates';
import { BatchJob } from '../batch/BatchProcessor';
import { ScheduledTask } from '../scheduling/Scheduler';

export interface Script {
  id: string;
  name: string;
  description?: string;
  version: string;
  language: 'javascript' | 'typescript' | 'python' | 'lua' | 'custom';
  code: string;
  type: 'form_processor' | 'data_transformer' | 'validation_rule' | 'automation' | 'custom';
  category: 'form' | 'data' | 'validation' | 'automation' | 'utility';
  tags: string[];
  parameters: ScriptParameter[];
  returnType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'void';
  dependencies: ScriptDependency[];
  permissions: ScriptPermissions;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    lastExecuted?: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    size: number;
  };
}

export interface ScriptParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
    custom?: string; // JavaScript validation function
  };
}

export interface ScriptDependency {
  name: string;
  version: string;
  type: 'npm' | 'local' | 'builtin';
  description?: string;
}

export interface ScriptPermissions {
  fileSystem: {
    read: boolean;
    write: boolean;
    execute: boolean;
  };
  network: {
    http: boolean;
    websocket: boolean;
    tcp: boolean;
  };
  system: {
    process: boolean;
    environment: boolean;
    clipboard: boolean;
  };
  browser: {
    dom: boolean;
    storage: boolean;
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
  };
}

export interface ScriptExecutionContext {
  scriptId: string;
  executionId: string;
  startTime: number;
  parameters: { [key: string]: any };
  globals: { [key: string]: any };
  imports: { [key: string]: any };
  logger: ScriptLogger;
  sandbox: ScriptSandbox;
}

export interface ScriptLogger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
}

export interface ScriptSandbox {
  // File System
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(path: string): Promise<string[]>;
  
  // Network
  httpRequest(url: string, options?: any): Promise<any>;
  websocketConnect(url: string): Promise<WebSocket>;
  
  // System
  getEnvironmentVariable(name: string): string | undefined;
  setEnvironmentVariable(name: string, value: string): void;
  executeCommand(command: string): Promise<string>;
  
  // Browser
  querySelector(selector: string): Element | null;
  querySelectorAll(selector: string): NodeListOf<Element>;
  getLocalStorage(key: string): string | null;
  setLocalStorage(key: string, value: string): void;
  
  // Utilities
  sleep(ms: number): Promise<void>;
  random(min: number, max: number): number;
  uuid(): string;
  hash(data: string): string;
  encrypt(data: string, key: string): string;
  decrypt(data: string, key: string): string;
}

export interface ScriptExecution {
  id: string;
  scriptId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: number;
  endTime?: number;
  duration?: number;
  parameters: { [key: string]: any };
  result?: any;
  error?: string;
  logs: ScriptLogEntry[];
  metadata: {
    executedBy: string;
    executionContext: string;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface ScriptLogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  template: string;
  parameters: ScriptParameter[];
  examples: ScriptExample[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    downloads: number;
    rating: number;
  };
}

export interface ScriptExample {
  name: string;
  description: string;
  code: string;
  parameters: { [key: string]: any };
  expectedResult: any;
}

export interface ScriptAnalytics {
  totalScripts: number;
  activeScripts: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  errorRate: number;
  topScripts: { scriptId: string; name: string; executions: number }[];
  recentExecutions: ScriptExecution[];
  errorTrends: { date: string; errors: number }[];
}

export class ScriptEngine extends EventEmitter {
  private logger: Logger;
  private scripts: Map<string, Script> = new Map();
  private executions: Map<string, ScriptExecution> = new Map();
  private templates: Map<string, ScriptTemplate> = new Map();
  private runningExecutions: Map<string, ScriptExecutionContext> = new Map();

  constructor() {
    super();
    this.logger = new Logger();
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    // Form Data Processor Template
    const formProcessorTemplate: ScriptTemplate = {
      id: 'form-processor-template',
      name: 'Form Data Processor',
      description: 'Process and transform form data',
      category: 'form',
      language: 'javascript',
      template: `// Form Data Processor Script
// Parameters: data (object), rules (array), options (object)

function processFormData(data, rules, options = {}) {
  const result = {
    processed: {},
    errors: [],
    warnings: []
  };

  // Apply processing rules
  rules.forEach(rule => {
    try {
      const field = rule.field;
      const value = data[field];
      
      if (rule.type === 'transform') {
        result.processed[field] = rule.transform(value, data);
      } else if (rule.type === 'validate') {
        if (!rule.validator(value, data)) {
          result.errors.push(\`Validation failed for field: \${field}\`);
        }
      } else if (rule.type === 'format') {
        result.processed[field] = rule.formatter(value);
      }
    } catch (error) {
      result.errors.push(\`Error processing field \${rule.field}: \${error.message}\`);
    }
  });

  return result;
}

// Export the function
return processFormData;`,
      parameters: [
        {
          name: 'data',
          type: 'object',
          required: true,
          description: 'Form data to process'
        },
        {
          name: 'rules',
          type: 'array',
          required: true,
          description: 'Processing rules to apply'
        },
        {
          name: 'options',
          type: 'object',
          required: false,
          description: 'Additional options'
        }
      ],
      examples: [
        {
          name: 'Basic Data Transformation',
          description: 'Transform form data using simple rules',
          code: `const data = { name: "john doe", email: "JOHN@EXAMPLE.COM" };
const rules = [
  {
    field: 'name',
    type: 'transform',
    transform: (value) => value.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  },
  {
    field: 'email',
    type: 'transform',
    transform: (value) => value.toLowerCase()
  }
];
const result = processFormData(data, rules);`,
          parameters: {
            data: { name: "john doe", email: "JOHN@EXAMPLE.COM" },
            rules: [
              {
                field: 'name',
                type: 'transform',
                transform: '(value) => value.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")'
              },
              {
                field: 'email',
                type: 'transform',
                transform: '(value) => value.toLowerCase()'
              }
            ]
          },
          expectedResult: {
            processed: { name: "John Doe", email: "john@example.com" },
            errors: [],
            warnings: []
          }
        }
      ],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        downloads: 0,
        rating: 5
      }
    };

    // Data Validator Template
    const validatorTemplate: ScriptTemplate = {
      id: 'data-validator-template',
      name: 'Data Validator',
      description: 'Validate form data with custom rules',
      category: 'validation',
      language: 'javascript',
      template: `// Data Validator Script
// Parameters: data (object), rules (object)

function validateData(data, rules) {
  const result = {
    isValid: true,
    errors: [],
    warnings: []
  };

  Object.keys(rules).forEach(field => {
    const value = data[field];
    const fieldRules = rules[field];

    fieldRules.forEach(rule => {
      try {
        if (rule.required && (value === undefined || value === null || value === '')) {
          result.errors.push(\`Field '\${field}' is required\`);
          result.isValid = false;
          return;
        }

        if (value !== undefined && value !== null && value !== '') {
          if (rule.type === 'email' && !isValidEmail(value)) {
            result.errors.push(\`Field '\${field}' must be a valid email\`);
            result.isValid = false;
          } else if (rule.type === 'phone' && !isValidPhone(value)) {
            result.errors.push(\`Field '\${field}' must be a valid phone number\`);
            result.isValid = false;
          } else if (rule.type === 'minLength' && value.length < rule.value) {
            result.errors.push(\`Field '\${field}' must be at least \${rule.value} characters\`);
            result.isValid = false;
          } else if (rule.type === 'maxLength' && value.length > rule.value) {
            result.errors.push(\`Field '\${field}' must be no more than \${rule.value} characters\`);
            result.isValid = false;
          } else if (rule.type === 'pattern' && !rule.pattern.test(value)) {
            result.errors.push(\`Field '\${field}' does not match required pattern\`);
            result.isValid = false;
          } else if (rule.type === 'custom' && !rule.validator(value, data)) {
            result.errors.push(\`Field '\${field}' failed custom validation\`);
            result.isValid = false;
          }
        }
      } catch (error) {
        result.errors.push(\`Validation error for field '\${field}': \${error.message}\`);
        result.isValid = false;
      }
    });
  });

  return result;
}

function isValidEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\\+]?[1-9][\\d]{0,15}$/.test(phone.replace(/[\\s\\-\\(\\)]/g, ''));
}

return validateData;`,
      parameters: [
        {
          name: 'data',
          type: 'object',
          required: true,
          description: 'Data to validate'
        },
        {
          name: 'rules',
          type: 'object',
          required: true,
          description: 'Validation rules'
        }
      ],
      examples: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        downloads: 0,
        rating: 5
      }
    };

    this.templates.set(formProcessorTemplate.id, formProcessorTemplate);
    this.templates.set(validatorTemplate.id, validatorTemplate);
  }

  // Script Management

  public createScript(script: Omit<Script, 'id' | 'metadata'>): Script {
    const newScript: Script = {
      ...script,
      id: `script-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user',
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        size: script.code.length
      }
    };

    this.scripts.set(newScript.id, newScript);
    this.logger.info('Script created', { scriptId: newScript.id, name: newScript.name });
    this.emit('script_created', newScript);

    return newScript;
  }

  public updateScript(scriptId: string, updates: Partial<Script>): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) {
      return false;
    }

    const updatedScript = {
      ...script,
      ...updates,
      metadata: {
        ...script.metadata,
        updatedAt: new Date().toISOString(),
        size: updates.code ? updates.code.length : script.metadata.size
      }
    };

    this.scripts.set(scriptId, updatedScript);
    this.logger.info('Script updated', { scriptId, name: updatedScript.name });
    this.emit('script_updated', updatedScript);

    return true;
  }

  public deleteScript(scriptId: string): boolean {
    const script = this.scripts.get(scriptId);
    if (!script) {
      return false;
    }

    this.scripts.delete(scriptId);
    this.logger.info('Script deleted', { scriptId, name: script.name });
    this.emit('script_deleted', scriptId);

    return true;
  }

  public getScript(scriptId: string): Script | null {
    return this.scripts.get(scriptId) || null;
  }

  public getAllScripts(): Script[] {
    return Array.from(this.scripts.values());
  }

  public getScriptsByCategory(category: string): Script[] {
    return Array.from(this.scripts.values()).filter(script => script.category === category);
  }

  // Script Execution

  public async executeScript(scriptId: string, parameters: { [key: string]: any } = {}): Promise<ScriptExecution> {
    const script = this.scripts.get(scriptId);
    if (!script) {
      throw new Error('Script not found');
    }

    const executionId = `execution-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();

    const execution: ScriptExecution = {
      id: executionId,
      scriptId,
      status: 'pending',
      startTime,
      parameters,
      logs: [],
      metadata: {
        executedBy: 'user',
        executionContext: 'manual',
        memoryUsage: 0,
        cpuUsage: 0
      }
    };

    this.executions.set(executionId, execution);
    this.emit('script_execution_started', execution);

    try {
      // Validate parameters
      this.validateParameters(script, parameters);

      // Create execution context
      const context = this.createExecutionContext(script, executionId, parameters);
      this.runningExecutions.set(executionId, context);

      // Update execution status
      execution.status = 'running';
      this.executions.set(executionId, execution);

      // Execute script based on language
      let result: any;
      switch (script.language) {
        case 'javascript':
        case 'typescript':
          result = await this.executeJavaScript(script, context);
          break;
        case 'python':
          result = await this.executePython(script, context);
          break;
        case 'lua':
          result = await this.executeLua(script, context);
          break;
        default:
          throw new Error(`Unsupported script language: ${script.language}`);
      }

      // Update execution with result
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.result = result;

      // Update script statistics
      script.metadata.totalExecutions++;
      script.metadata.successfulExecutions++;
      script.metadata.lastExecuted = new Date().toISOString();
      script.metadata.averageExecutionTime = 
        (script.metadata.averageExecutionTime * (script.metadata.totalExecutions - 1) + execution.duration) / 
        script.metadata.totalExecutions;

      this.scripts.set(scriptId, script);
      this.executions.set(executionId, execution);

      this.logger.info('Script executed successfully', { 
        scriptId, 
        executionId, 
        duration: execution.duration 
      });
      this.emit('script_execution_completed', execution);

    } catch (error: any) {
      // Update execution with error
      execution.status = 'failed';
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      execution.error = error.message;

      // Update script statistics
      script.metadata.totalExecutions++;
      script.metadata.failedExecutions++;
      script.metadata.lastExecuted = new Date().toISOString();

      this.scripts.set(scriptId, script);
      this.executions.set(executionId, execution);

      this.logger.error('Script execution failed', { 
        scriptId, 
        executionId, 
        error: error.message 
      });
      this.emit('script_execution_failed', execution);
    } finally {
      this.runningExecutions.delete(executionId);
    }

    return execution;
  }

  public async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = Date.now();
    execution.duration = execution.endTime - execution.startTime;

    this.executions.set(executionId, execution);
    this.runningExecutions.delete(executionId);

    this.logger.info('Script execution cancelled', { executionId });
    this.emit('script_execution_cancelled', execution);

    return true;
  }

  private validateParameters(script: Script, parameters: { [key: string]: any }): void {
    script.parameters.forEach(param => {
      if (param.required && !(param.name in parameters)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      if (param.name in parameters) {
        const value = parameters[param.name];
        const expectedType = param.type;

        if (expectedType !== 'any' && typeof value !== expectedType) {
          throw new Error(`Parameter '${param.name}' must be of type ${expectedType}`);
        }

        if (param.validation) {
          this.validateParameterValue(param, value);
        }
      }
    });
  }

  private validateParameterValue(param: ScriptParameter, value: any): void {
    if (param.validation) {
      const validation = param.validation;

      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Parameter '${param.name}' must be at least ${validation.min}`);
      }

      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Parameter '${param.name}' must be no more than ${validation.max}`);
      }

      if (validation.pattern && !validation.pattern.test(value)) {
        throw new Error(`Parameter '${param.name}' does not match required pattern`);
      }

      if (validation.enum && !validation.enum.includes(value)) {
        throw new Error(`Parameter '${param.name}' must be one of: ${validation.enum.join(', ')}`);
      }

      if (validation.custom) {
        try {
          const customValidator = new Function('value', validation.custom);
          if (!customValidator(value)) {
            throw new Error(`Parameter '${param.name}' failed custom validation`);
          }
        } catch (error) {
          throw new Error(`Custom validation failed for parameter '${param.name}': ${error.message}`);
        }
      }
    }
  }

  private createExecutionContext(script: Script, executionId: string, parameters: { [key: string]: any }): ScriptExecutionContext {
    const logger: ScriptLogger = {
      debug: (message: string, data?: any) => this.addLogEntry(executionId, 'debug', message, data),
      info: (message: string, data?: any) => this.addLogEntry(executionId, 'info', message, data),
      warn: (message: string, data?: any) => this.addLogEntry(executionId, 'warn', message, data),
      error: (message: string, data?: any) => this.addLogEntry(executionId, 'error', message, data)
    };

    const sandbox: ScriptSandbox = {
      // File System
      readFile: async (path: string) => {
        if (!script.permissions.fileSystem.read) {
          throw new Error('File system read permission not granted');
        }
        // Implement file reading
        return '';
      },
      writeFile: async (path: string, content: string) => {
        if (!script.permissions.fileSystem.write) {
          throw new Error('File system write permission not granted');
        }
        // Implement file writing
      },
      listFiles: async (path: string) => {
        if (!script.permissions.fileSystem.read) {
          throw new Error('File system read permission not granted');
        }
        // Implement file listing
        return [];
      },

      // Network
      httpRequest: async (url: string, options?: any) => {
        if (!script.permissions.network.http) {
          throw new Error('HTTP network permission not granted');
        }
        // Implement HTTP request
        return {};
      },
      websocketConnect: async (url: string) => {
        if (!script.permissions.network.websocket) {
          throw new Error('WebSocket network permission not granted');
        }
        // Implement WebSocket connection
        return new WebSocket(url);
      },

      // System
      getEnvironmentVariable: (name: string) => {
        if (!script.permissions.system.environment) {
          throw new Error('Environment access permission not granted');
        }
        return process.env[name];
      },
      setEnvironmentVariable: (name: string, value: string) => {
        if (!script.permissions.system.environment) {
          throw new Error('Environment access permission not granted');
        }
        process.env[name] = value;
      },
      executeCommand: async (command: string) => {
        if (!script.permissions.system.process) {
          throw new Error('Process execution permission not granted');
        }
        // Implement command execution
        return '';
      },

      // Browser
      querySelector: (selector: string) => {
        if (!script.permissions.browser.dom) {
          throw new Error('DOM access permission not granted');
        }
        return document.querySelector(selector);
      },
      querySelectorAll: (selector: string) => {
        if (!script.permissions.browser.dom) {
          throw new Error('DOM access permission not granted');
        }
        return document.querySelectorAll(selector);
      },
      getLocalStorage: (key: string) => {
        if (!script.permissions.browser.storage) {
          throw new Error('Storage access permission not granted');
        }
        return localStorage.getItem(key);
      },
      setLocalStorage: (key: string, value: string) => {
        if (!script.permissions.browser.storage) {
          throw new Error('Storage access permission not granted');
        }
        localStorage.setItem(key, value);
      },

      // Utilities
      sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
      random: (min: number, max: number) => Math.random() * (max - min) + min,
      uuid: () => `uuid-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      hash: (data: string) => {
        // Simple hash implementation
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
      },
      encrypt: (data: string, key: string) => {
        // Simple encryption implementation
        return btoa(data + key);
      },
      decrypt: (data: string, key: string) => {
        // Simple decryption implementation
        const decoded = atob(data);
        return decoded.replace(key, '');
      }
    };

    return {
      scriptId: script.id,
      executionId,
      startTime: Date.now(),
      parameters,
      globals: {},
      imports: {},
      logger,
      sandbox
    };
  }

  private addLogEntry(executionId: string, level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const logEntry: ScriptLogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    execution.logs.push(logEntry);
    this.executions.set(executionId, execution);
  }

  private async executeJavaScript(script: Script, context: ScriptExecutionContext): Promise<any> {
    try {
      // Create a safe execution environment
      const sandbox = context.sandbox;
      const logger = context.logger;
      const parameters = context.parameters;

      // Build the script with sandboxed environment
      const scriptCode = `
        (function() {
          ${script.code}
        })();
      `;

      // Execute the script
      const result = eval(scriptCode);
      return result;
    } catch (error: any) {
      throw new Error(`JavaScript execution error: ${error.message}`);
    }
  }

  private async executePython(script: Script, context: ScriptExecutionContext): Promise<any> {
    // This would require a Python runtime like Pyodide or Node.js Python bridge
    throw new Error('Python execution not yet implemented');
  }

  private async executeLua(script: Script, context: ScriptExecutionContext): Promise<any> {
    // This would require a Lua runtime
    throw new Error('Lua execution not yet implemented');
  }

  // Template Management

  public getTemplate(templateId: string): ScriptTemplate | null {
    return this.templates.get(templateId) || null;
  }

  public getAllTemplates(): ScriptTemplate[] {
    return Array.from(this.templates.values());
  }

  public getTemplatesByCategory(category: string): ScriptTemplate[] {
    return Array.from(this.templates.values()).filter(template => template.category === category);
  }

  public createScriptFromTemplate(templateId: string, name: string, customizations?: any): Script {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const script: Omit<Script, 'id' | 'metadata'> = {
      name,
      description: template.description,
      version: '1.0.0',
      language: template.language as any,
      code: template.template,
      type: 'custom',
      category: template.category as any,
      tags: [],
      parameters: template.parameters,
      returnType: 'any',
      dependencies: [],
      permissions: {
        fileSystem: { read: false, write: false, execute: false },
        network: { http: false, websocket: false, tcp: false },
        system: { process: false, environment: false, clipboard: false },
        browser: { dom: false, storage: false, geolocation: false, camera: false, microphone: false }
      }
    };

    return this.createScript(script);
  }

  // Execution Management

  public getExecution(executionId: string): ScriptExecution | null {
    return this.executions.get(executionId) || null;
  }

  public getExecutionsByScript(scriptId: string, limit: number = 100): ScriptExecution[] {
    return Array.from(this.executions.values())
      .filter(execution => execution.scriptId === scriptId)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  public getAllExecutions(limit: number = 100): ScriptExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  // Analytics

  public getAnalytics(): ScriptAnalytics {
    const scripts = Array.from(this.scripts.values());
    const executions = Array.from(this.executions.values());

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(e => e.status === 'completed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const averageExecutionTime = executions.reduce((sum, e) => sum + (e.duration || 0), 0) / totalExecutions || 0;

    const topScripts = scripts
      .map(script => ({
        scriptId: script.id,
        name: script.name,
        executions: script.metadata.totalExecutions
      }))
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10);

    const recentExecutions = executions
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 50);

    return {
      totalScripts: scripts.length,
      activeScripts: scripts.filter(s => s.metadata.totalExecutions > 0).length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime,
      errorRate: totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0,
      topScripts,
      recentExecutions,
      errorTrends: this.calculateErrorTrends(executions)
    };
  }

  private calculateErrorTrends(executions: ScriptExecution[]): { date: string; errors: number }[] {
    const trends: { [date: string]: number } = {};
    
    executions.forEach(execution => {
      if (execution.status === 'failed') {
        const date = new Date(execution.startTime).toISOString().split('T')[0];
        trends[date] = (trends[date] || 0) + 1;
      }
    });

    return Object.entries(trends)
      .map(([date, errors]) => ({ date, errors }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Export/Import

  public exportScriptData(): string {
    const data = {
      scripts: Array.from(this.scripts.values()),
      templates: Array.from(this.templates.values()),
      executions: Array.from(this.executions.values()).slice(-1000) // Last 1000 executions
    };

    return JSON.stringify(data, null, 2);
  }

  public importScriptData(data: string): boolean {
    try {
      const parsedData = JSON.parse(data);
      
      if (parsedData.scripts) {
        for (const script of parsedData.scripts) {
          this.scripts.set(script.id, script);
        }
      }

      if (parsedData.templates) {
        for (const template of parsedData.templates) {
          this.templates.set(template.id, template);
        }
      }

      if (parsedData.executions) {
        for (const execution of parsedData.executions) {
          this.executions.set(execution.id, execution);
        }
      }

      this.logger.info('Script data imported successfully');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import script data', error);
      return false;
    }
  }
}
