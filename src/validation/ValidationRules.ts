import { Logger } from '../utils/Logger';
import { AdvancedQuestion } from '../scanner/AdvancedFormScanner';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: 'required' | 'format' | 'range' | 'custom' | 'conditional';
  category: 'text' | 'number' | 'date' | 'email' | 'url' | 'phone' | 'general';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  
  // Rule configuration
  config: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minValue?: number;
    maxValue?: number;
    allowedValues?: string[];
    forbiddenValues?: string[];
    customFunction?: string;
    condition?: ValidationCondition;
  };
  
  // Rule metadata
  metadata: {
    createdAt: string;
    updatedAt: string;
    author: string;
    version: string;
    tags: string[];
  };
}

export interface ValidationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value: any;
  logic: 'and' | 'or';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  ruleId: string;
  message: string;
  field: string;
  value: any;
  severity: 'error';
  suggestion?: string;
}

export interface ValidationWarning {
  ruleId: string;
  message: string;
  field: string;
  value: any;
  severity: 'warning';
  suggestion?: string;
}

export interface ValidationInfo {
  ruleId: string;
  message: string;
  field: string;
  value: any;
  severity: 'info';
  suggestion?: string;
}

export interface ValidationContext {
  question: AdvancedQuestion;
  value: any;
  allValues: Map<string, any>;
  formMetadata: {
    title: string;
    description?: string;
    category?: string;
  };
}

export class ValidationRules {
  private logger: Logger;
  private rules: Map<string, ValidationRule> = new Map();
  private builtInRules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.logger = new Logger();
    this.initializeBuiltInRules();
  }

  private initializeBuiltInRules(): void {
    // Email validation
    this.registerBuiltInRule({
      id: 'email-format',
      name: 'Email Format Validation',
      description: 'Validates email address format',
      type: 'format',
      category: 'email',
      severity: 'error',
      enabled: true,
      config: {
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['email', 'format', 'required']
      }
    });

    // Phone number validation
    this.registerBuiltInRule({
      id: 'phone-format',
      name: 'Phone Number Format',
      description: 'Validates phone number format',
      type: 'format',
      category: 'phone',
      severity: 'error',
      enabled: true,
      config: {
        pattern: '^[\\+]?[1-9][\\d]{0,15}$'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['phone', 'format', 'required']
      }
    });

    // URL validation
    this.registerBuiltInRule({
      id: 'url-format',
      name: 'URL Format Validation',
      description: 'Validates URL format',
      type: 'format',
      category: 'url',
      severity: 'error',
      enabled: true,
      config: {
        pattern: '^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)$'
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['url', 'format', 'required']
      }
    });

    // Required field validation
    this.registerBuiltInRule({
      id: 'required-field',
      name: 'Required Field Validation',
      description: 'Ensures required fields are not empty',
      type: 'required',
      category: 'general',
      severity: 'error',
      enabled: true,
      config: {
        minLength: 1
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['required', 'general']
      }
    });

    // Text length validation
    this.registerBuiltInRule({
      id: 'text-length',
      name: 'Text Length Validation',
      description: 'Validates text length within specified range',
      type: 'range',
      category: 'text',
      severity: 'warning',
      enabled: true,
      config: {
        minLength: 2,
        maxLength: 1000
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['length', 'text', 'range']
      }
    });

    // Number range validation
    this.registerBuiltInRule({
      id: 'number-range',
      name: 'Number Range Validation',
      description: 'Validates numeric values within specified range',
      type: 'range',
      category: 'number',
      severity: 'error',
      enabled: true,
      config: {
        minValue: 0,
        maxValue: 100
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['number', 'range', 'validation']
      }
    });

    // Date validation
    this.registerBuiltInRule({
      id: 'date-range',
      name: 'Date Range Validation',
      description: 'Validates dates within acceptable range',
      type: 'range',
      category: 'date',
      severity: 'warning',
      enabled: true,
      config: {
        minValue: new Date('1900-01-01').getTime(),
        maxValue: new Date('2100-12-31').getTime()
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['date', 'range', 'validation']
      }
    });

    // Age validation
    this.registerBuiltInRule({
      id: 'age-range',
      name: 'Age Range Validation',
      description: 'Validates age is within reasonable range',
      type: 'range',
      category: 'number',
      severity: 'warning',
      enabled: true,
      config: {
        minValue: 13,
        maxValue: 120
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['age', 'range', 'validation']
      }
    });

    // Name validation
    this.registerBuiltInRule({
      id: 'name-format',
      name: 'Name Format Validation',
      description: 'Validates name contains only letters and spaces',
      type: 'format',
      category: 'text',
      severity: 'warning',
      enabled: true,
      config: {
        pattern: '^[a-zA-Z\\s\\-\'\.]+$',
        minLength: 2,
        maxLength: 50
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['name', 'format', 'text']
      }
    });

    // Password strength validation
    this.registerBuiltInRule({
      id: 'password-strength',
      name: 'Password Strength Validation',
      description: 'Validates password meets strength requirements',
      type: 'format',
      category: 'text',
      severity: 'error',
      enabled: true,
      config: {
        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$',
        minLength: 8
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'System',
        version: '1.0.0',
        tags: ['password', 'security', 'strength']
      }
    });
  }

  private registerBuiltInRule(rule: ValidationRule): void {
    this.builtInRules.set(rule.id, rule);
  }

  public validateValue(context: ValidationContext): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      info: []
    };

    // Get applicable rules for this question
    const applicableRules = this.getApplicableRules(context.question);

    for (const rule of applicableRules) {
      if (!rule.enabled) continue;

      try {
        const ruleResult = this.executeRule(rule, context);
        
        if (!ruleResult.isValid) {
          result.isValid = false;
          
          switch (ruleResult.severity) {
            case 'error':
              result.errors.push(ruleResult);
              break;
            case 'warning':
              result.warnings.push(ruleResult);
              break;
            case 'info':
              result.info.push(ruleResult);
              break;
          }
        }
      } catch (error: any) {
        this.logger.error('Rule execution failed', { ruleId: rule.id, error });
        result.errors.push({
          ruleId: rule.id,
          message: 'Rule execution failed: ' + error.message,
          field: context.question.id,
          value: context.value,
          severity: 'error'
        });
        result.isValid = false;
      }
    }

    return result;
  }

  private getApplicableRules(question: AdvancedQuestion): ValidationRule[] {
    const applicableRules: ValidationRule[] = [];

    // Add built-in rules
    for (const rule of this.builtInRules.values()) {
      if (this.isRuleApplicable(rule, question)) {
        applicableRules.push(rule);
      }
    }

    // Add custom rules
    for (const rule of this.rules.values()) {
      if (this.isRuleApplicable(rule, question)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  private isRuleApplicable(rule: ValidationRule, question: AdvancedQuestion): boolean {
    // Check if rule applies to this question type
    const questionText = question.question.toLowerCase();
    
    // Email rules
    if (rule.category === 'email' && (
      questionText.includes('email') || 
      questionText.includes('e-mail') ||
      question.type === 'text' && questionText.includes('@')
    )) {
      return true;
    }

    // Phone rules
    if (rule.category === 'phone' && (
      questionText.includes('phone') || 
      questionText.includes('mobile') ||
      questionText.includes('telephone')
    )) {
      return true;
    }

    // URL rules
    if (rule.category === 'url' && (
      questionText.includes('url') || 
      questionText.includes('website') ||
      questionText.includes('link')
    )) {
      return true;
    }

    // Name rules
    if (rule.category === 'text' && rule.id === 'name-format' && (
      questionText.includes('name') || 
      questionText.includes('first name') ||
      questionText.includes('last name')
    )) {
      return true;
    }

    // Password rules
    if (rule.category === 'text' && rule.id === 'password-strength' && (
      questionText.includes('password') || 
      questionText.includes('pass')
    )) {
      return true;
    }

    // Age rules
    if (rule.category === 'number' && rule.id === 'age-range' && (
      questionText.includes('age') || 
      questionText.includes('years old')
    )) {
      return true;
    }

    // Date rules
    if (rule.category === 'date' && (
      question.type === 'date' || 
      questionText.includes('date') ||
      questionText.includes('birth')
    )) {
      return true;
    }

    // Number rules
    if (rule.category === 'number' && (
      question.type === 'linear_scale' ||
      questionText.includes('number') ||
      questionText.includes('count')
    )) {
      return true;
    }

    // Text rules
    if (rule.category === 'text' && (
      question.type === 'text' || 
      question.type === 'paragraph'
    )) {
      return true;
    }

    // Required rules
    if (rule.type === 'required' && question.required) {
      return true;
    }

    return false;
  }

  private executeRule(rule: ValidationRule, context: ValidationContext): ValidationError | ValidationWarning | ValidationInfo {
    const { question, value, allValues } = context;

    // Check conditional rules first
    if (rule.type === 'conditional' && rule.config.condition) {
      if (!this.evaluateCondition(rule.config.condition, allValues)) {
        return {
          ruleId: rule.id,
          message: 'Condition not met',
          field: question.id,
          value,
          severity: 'info'
        };
      }
    }

    switch (rule.type) {
      case 'required':
        return this.validateRequired(rule, context);
      case 'format':
        return this.validateFormat(rule, context);
      case 'range':
        return this.validateRange(rule, context);
      case 'custom':
        return this.validateCustom(rule, context);
      default:
        throw new Error(`Unknown rule type: ${rule.type}`);
    }
  }

  private validateRequired(rule: ValidationRule, context: ValidationContext): ValidationError | ValidationWarning | ValidationInfo {
    const { question, value } = context;
    
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} is required`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: 'Please provide a value for this field'
      };
    }

    return {
      ruleId: rule.id,
      message: 'Field is valid',
      field: question.id,
      value,
      severity: 'info'
    };
  }

  private validateFormat(rule: ValidationRule, context: ValidationContext): ValidationError | ValidationWarning | ValidationInfo {
    const { question, value } = context;
    
    if (!value) {
      return {
        ruleId: rule.id,
        message: 'Field is valid (empty)',
        field: question.id,
        value,
        severity: 'info'
      };
    }

    const stringValue = String(value);

    // Pattern validation
    if (rule.config.pattern) {
      const regex = new RegExp(rule.config.pattern);
      if (!regex.test(stringValue)) {
        return {
          ruleId: rule.id,
          message: `${question.question || 'This field'} format is invalid`,
          field: question.id,
          value,
          severity: rule.severity,
          suggestion: this.getFormatSuggestion(rule)
        };
      }
    }

    // Length validation
    if (rule.config.minLength && stringValue.length < rule.config.minLength) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} is too short (minimum ${rule.config.minLength} characters)`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: `Please enter at least ${rule.config.minLength} characters`
      };
    }

    if (rule.config.maxLength && stringValue.length > rule.config.maxLength) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} is too long (maximum ${rule.config.maxLength} characters)`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: `Please enter no more than ${rule.config.maxLength} characters`
      };
    }

    return {
      ruleId: rule.id,
      message: 'Format is valid',
      field: question.id,
      value,
      severity: 'info'
    };
  }

  private validateRange(rule: ValidationRule, context: ValidationContext): ValidationError | ValidationWarning | ValidationInfo {
    const { question, value } = context;
    
    if (!value) {
      return {
        ruleId: rule.id,
        message: 'Field is valid (empty)',
        field: question.id,
        value,
        severity: 'info'
      };
    }

    const numericValue = this.parseNumericValue(value);
    
    if (numericValue === null) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} must be a valid number`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: 'Please enter a valid number'
      };
    }

    // Min value validation
    if (rule.config.minValue !== undefined && numericValue < rule.config.minValue) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} is too small (minimum ${rule.config.minValue})`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: `Please enter a value of at least ${rule.config.minValue}`
      };
    }

    // Max value validation
    if (rule.config.maxValue !== undefined && numericValue > rule.config.maxValue) {
      return {
        ruleId: rule.id,
        message: `${question.question || 'This field'} is too large (maximum ${rule.config.maxValue})`,
        field: question.id,
        value,
        severity: rule.severity,
        suggestion: `Please enter a value no more than ${rule.config.maxValue}`
      };
    }

    return {
      ruleId: rule.id,
      message: 'Range is valid',
      field: question.id,
      value,
      severity: 'info'
    };
  }

  private validateCustom(rule: ValidationRule, context: ValidationContext): ValidationError | ValidationWarning | ValidationInfo {
    const { question, value } = context;
    
    if (!rule.config.customFunction) {
      return {
        ruleId: rule.id,
        message: 'Custom validation function not defined',
        field: question.id,
        value,
        severity: 'error'
      };
    }

    try {
      // In a real implementation, this would execute the custom function safely
      // For now, we'll just return a placeholder
      return {
        ruleId: rule.id,
        message: 'Custom validation not implemented',
        field: question.id,
        value,
        severity: 'info'
      };
    } catch (error: any) {
      return {
        ruleId: rule.id,
        message: 'Custom validation failed: ' + error.message,
        field: question.id,
        value,
        severity: 'error'
      };
    }
  }

  private evaluateCondition(condition: ValidationCondition, allValues: Map<string, any>): boolean {
    const fieldValue = allValues.get(condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null || fieldValue === '';
      default:
        return false;
    }
  }

  private parseNumericValue(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (value instanceof Date) {
      return value.getTime();
    }
    
    return null;
  }

  private getFormatSuggestion(rule: ValidationRule): string {
    switch (rule.id) {
      case 'email-format':
        return 'Please enter a valid email address (e.g., user@example.com)';
      case 'phone-format':
        return 'Please enter a valid phone number (e.g., +1234567890)';
      case 'url-format':
        return 'Please enter a valid URL (e.g., https://example.com)';
      case 'name-format':
        return 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)';
      case 'password-strength':
        return 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character';
      default:
        return 'Please check the format and try again';
    }
  }

  // Public methods for rule management

  public createCustomRule(rule: Omit<ValidationRule, 'id' | 'metadata'>): ValidationRule {
    const newRule: ValidationRule = {
      ...rule,
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'User',
        version: '1.0.0',
        tags: ['custom', ...(rule.metadata?.tags || [])]
      }
    };

    this.rules.set(newRule.id, newRule);
    this.logger.info('Custom validation rule created', { ruleId: newRule.id, name: newRule.name });
    
    return newRule;
  }

  public updateRule(ruleId: string, updates: Partial<ValidationRule>): boolean {
    const rule = this.rules.get(ruleId) || this.builtInRules.get(ruleId);
    if (!rule) {
      return false;
    }

    const updatedRule = {
      ...rule,
      ...updates,
      metadata: {
        ...rule.metadata,
        updatedAt: new Date().toISOString()
      }
    };

    if (this.builtInRules.has(ruleId)) {
      // Create a custom copy of built-in rule
      updatedRule.id = `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      this.rules.set(updatedRule.id, updatedRule);
    } else {
      this.rules.set(ruleId, updatedRule);
    }

    this.logger.info('Validation rule updated', { ruleId: updatedRule.id, name: updatedRule.name });
    return true;
  }

  public deleteRule(ruleId: string): boolean {
    if (this.builtInRules.has(ruleId)) {
      this.logger.warn('Cannot delete built-in rule', { ruleId });
      return false;
    }

    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      this.logger.info('Custom validation rule deleted', { ruleId });
    }
    return deleted;
  }

  public getRule(ruleId: string): ValidationRule | null {
    return this.rules.get(ruleId) || this.builtInRules.get(ruleId) || null;
  }

  public getAllRules(): ValidationRule[] {
    return [
      ...Array.from(this.builtInRules.values()),
      ...Array.from(this.rules.values())
    ];
  }

  public getBuiltInRules(): ValidationRule[] {
    return Array.from(this.builtInRules.values());
  }

  public getCustomRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  public exportRules(): string {
    const customRules = Array.from(this.rules.values());
    return JSON.stringify(customRules, null, 2);
  }

  public importRules(rulesData: string): boolean {
    try {
      const rules = JSON.parse(rulesData) as ValidationRule[];
      
      for (const rule of rules) {
        // Generate new ID to avoid conflicts
        rule.id = `imported-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        rule.metadata.updatedAt = new Date().toISOString();
        this.rules.set(rule.id, rule);
      }

      this.logger.info('Validation rules imported', { count: rules.length });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to import validation rules', error);
      return false;
    }
  }
}
