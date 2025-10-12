import { Logger } from '../utils/Logger';
import { AdvancedQuestion } from '../scanner/AdvancedFormScanner';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'survey' | 'application' | 'feedback' | 'registration' | 'contact' | 'custom';
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // in minutes
  popularity: number; // 0-100
  lastUpdated: string;
  author: string;
  version: string;
  
  // Template configuration
  config: {
    fillStrategies: Map<string, string>; // questionId -> strategyId
    customValues: Map<string, any>; // questionId -> custom value
    executionSettings: {
      runs: number;
      delayBetweenRuns: number;
      headless: boolean;
    };
  };
  
  // Template matching criteria
  matching: {
    keywords: string[];
    questionTypes: ('text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'linear_scale' | 'multiple_choice_grid' | 'checkbox_grid' | 'date' | 'time' | 'file_upload')[];
    minQuestions: number;
    maxQuestions: number;
    requiredFields: string[];
  };
  
  // Preview data
  preview: {
    screenshot?: string;
    description: string;
    features: string[];
    useCases: string[];
  };
}

export interface TemplateMatch {
  template: FormTemplate;
  score: number; // 0-100
  reasons: string[];
  confidence: number; // 0-1
}

export class FormTemplates {
  private logger: Logger;
  private templates: Map<string, FormTemplate> = new Map();
  private userTemplates: Map<string, FormTemplate> = new Map();

  constructor() {
    this.logger = new Logger();
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    // Survey Templates
    this.registerTemplate(this.createCustomerSatisfactionTemplate());
    this.registerTemplate(this.createEmployeeFeedbackTemplate());
    this.registerTemplate(this.createProductFeedbackTemplate());
    this.registerTemplate(this.createEventFeedbackTemplate());
    
    // Application Templates
    this.registerTemplate(this.createJobApplicationTemplate());
    this.registerTemplate(this.createScholarshipApplicationTemplate());
    this.registerTemplate(this.createVolunteerApplicationTemplate());
    
    // Registration Templates
    this.registerTemplate(this.createEventRegistrationTemplate());
    this.registerTemplate(this.createWorkshopRegistrationTemplate());
    this.registerTemplate(this.createNewsletterSignupTemplate());
    
    // Contact Templates
    this.registerTemplate(this.createContactFormTemplate());
    this.registerTemplate(this.createSupportRequestTemplate());
    this.registerTemplate(this.createQuoteRequestTemplate());
    
    // Custom Templates
    this.registerTemplate(this.createResearchSurveyTemplate());
    this.registerTemplate(this.createMarketResearchTemplate());
  }

  private registerTemplate(template: FormTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplates(category?: string, searchTerm?: string): FormTemplate[] {
    let filteredTemplates = Array.from(this.templates.values());
    
    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t => 
        t.name.toLowerCase().includes(term) ||
        t.description.toLowerCase().includes(term) ||
        t.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    return filteredTemplates.sort((a, b) => b.popularity - a.popularity);
  }

  public getTemplate(id: string): FormTemplate | null {
    return this.templates.get(id) || this.userTemplates.get(id) || null;
  }

  public findMatchingTemplates(
    questions: AdvancedQuestion[], 
    formTitle: string, 
    formDescription?: string
  ): TemplateMatch[] {
    const matches: TemplateMatch[] = [];
    
    for (const template of this.templates.values()) {
      const match = this.calculateTemplateMatch(template, questions, formTitle, formDescription);
      if (match.score > 30) { // Only include templates with >30% match
        matches.push(match);
      }
    }
    
    return matches.sort((a, b) => b.score - a.score);
  }

  public getRecommendedTemplate(
    questions: AdvancedQuestion[], 
    formTitle: string, 
    formDescription?: string
  ): TemplateMatch | null {
    const matches = this.findMatchingTemplates(questions, formTitle, formDescription);
    return matches.length > 0 ? matches[0] : null;
  }

  public createCustomTemplate(
    name: string,
    description: string,
    category: FormTemplate['category'],
    config: FormTemplate['config'],
    questions: AdvancedQuestion[]
  ): FormTemplate {
    const template: FormTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category,
      tags: this.extractTagsFromQuestions(questions),
      difficulty: this.calculateDifficulty(questions),
      estimatedTime: this.calculateEstimatedTime(questions),
      popularity: 0,
      lastUpdated: new Date().toISOString(),
      author: 'User',
      version: '1.0.0',
      config,
      matching: {
        keywords: this.extractKeywords(questions, name, description),
        questionTypes: [...new Set(questions.map(q => q.type))],
        minQuestions: questions.length,
        maxQuestions: questions.length,
        requiredFields: questions.filter(q => q.required).map(q => q.id)
      },
      preview: {
        description: `Custom template for ${name}`,
        features: this.extractFeatures(questions),
        useCases: [category]
      }
    };
    
    this.userTemplates.set(template.id, template);
    this.logger.info('Custom template created', { templateId: template.id, name });
    
    return template;
  }

  public saveTemplate(template: FormTemplate): void {
    if (template.id.startsWith('custom-')) {
      this.userTemplates.set(template.id, template);
    } else {
      this.templates.set(template.id, template);
    }
    this.logger.info('Template saved', { templateId: template.id });
  }

  public deleteTemplate(templateId: string): boolean {
    if (this.userTemplates.has(templateId)) {
      this.userTemplates.delete(templateId);
      this.logger.info('User template deleted', { templateId });
      return true;
    }
    return false; // Cannot delete built-in templates
  }

  public exportTemplate(templateId: string): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }
    
    return JSON.stringify(template, null, 2);
  }

  public importTemplate(templateData: string): FormTemplate {
    try {
      const template = JSON.parse(templateData) as FormTemplate;
      
      // Validate template structure
      if (!this.validateTemplate(template)) {
        throw new Error('Invalid template structure');
      }
      
      // Generate new ID for imported template
      template.id = `imported-${Date.now()}`;
      template.lastUpdated = new Date().toISOString();
      
      this.userTemplates.set(template.id, template);
      this.logger.info('Template imported', { templateId: template.id, name: template.name });
      
      return template;
    } catch (error: any) {
      this.logger.error('Failed to import template', error);
      throw new Error('Failed to import template: ' + error.message);
    }
  }

  private calculateTemplateMatch(
    template: FormTemplate,
    questions: AdvancedQuestion[],
    formTitle: string,
    formDescription?: string
  ): TemplateMatch {
    let score = 0;
    const reasons: string[] = [];
    
    // Check question count match
    const questionCount = questions.length;
    if (questionCount >= template.matching.minQuestions && 
        questionCount <= template.matching.maxQuestions) {
      score += 20;
      reasons.push('Question count matches');
    }
    
    // Check question types match
    const templateTypes = new Set(template.matching.questionTypes);
    const formTypes = new Set(questions.map(q => q.type));
    const typeMatches = [...templateTypes].filter(type => formTypes.has(type)).length;
    const typeScore = (typeMatches / templateTypes.size) * 30;
    score += typeScore;
    if (typeScore > 15) {
      reasons.push('Question types match well');
    }
    
    // Check keywords match
    const allText = `${formTitle} ${formDescription || ''} ${questions.map(q => q.question).join(' ')}`.toLowerCase();
    const keywordMatches = template.matching.keywords.filter(keyword => 
      allText.includes(keyword.toLowerCase())
    ).length;
    const keywordScore = (keywordMatches / template.matching.keywords.length) * 25;
    score += keywordScore;
    if (keywordScore > 10) {
      reasons.push('Keywords match');
    }
    
    // Check required fields match
    const requiredFields = questions.filter(q => q.required).map(q => q.id);
    const requiredMatches = template.matching.requiredFields.filter(field => 
      requiredFields.includes(field)
    ).length;
    const requiredScore = (requiredMatches / Math.max(template.matching.requiredFields.length, 1)) * 15;
    score += requiredScore;
    if (requiredScore > 5) {
      reasons.push('Required fields match');
    }
    
    // Bonus for exact category match
    if (this.detectFormCategory(formTitle, formDescription, questions) === template.category) {
      score += 10;
      reasons.push('Category matches');
    }
    
    const confidence = Math.min(score / 100, 1);
    
    return {
      template,
      score: Math.round(score),
      reasons,
      confidence
    };
  }

  private detectFormCategory(
    formTitle: string, 
    formDescription: string | undefined, 
    _questions: AdvancedQuestion[]
  ): FormTemplate['category'] {
    const text = `${formTitle} ${formDescription || ''}`.toLowerCase();
    
    if (text.includes('survey') || text.includes('feedback') || text.includes('opinion')) {
      return 'survey';
    }
    
    if (text.includes('application') || text.includes('apply') || text.includes('candidate')) {
      return 'application';
    }
    
    if (text.includes('register') || text.includes('signup') || text.includes('join')) {
      return 'registration';
    }
    
    if (text.includes('contact') || text.includes('reach') || text.includes('get in touch')) {
      return 'contact';
    }
    
    if (text.includes('feedback') || text.includes('review') || text.includes('rating')) {
      return 'feedback';
    }
    
    return 'custom';
  }

  private extractTagsFromQuestions(questions: AdvancedQuestion[]): string[] {
    const tags = new Set<string>();
    
    questions.forEach(question => {
      const questionText = question.question.toLowerCase();
      
      if (questionText.includes('name')) tags.add('name');
      if (questionText.includes('email')) tags.add('email');
      if (questionText.includes('phone')) tags.add('phone');
      if (questionText.includes('address')) tags.add('address');
      if (questionText.includes('age')) tags.add('age');
      if (questionText.includes('gender')) tags.add('gender');
      if (questionText.includes('rating')) tags.add('rating');
      if (questionText.includes('satisfaction')) tags.add('satisfaction');
      if (questionText.includes('experience')) tags.add('experience');
      if (questionText.includes('recommend')) tags.add('recommendation');
    });
    
    return Array.from(tags);
  }

  private calculateDifficulty(questions: AdvancedQuestion[]): 'easy' | 'medium' | 'hard' {
    const totalQuestions = questions.length;
    const requiredQuestions = questions.filter(q => q.required).length;
    const complexTypes = questions.filter(q => 
      ['paragraph', 'file_upload', 'multiple_choice_grid'].includes(q.type)
    ).length;
    
    if (totalQuestions > 20 || requiredQuestions > 10 || complexTypes > 5) {
      return 'hard';
    } else if (totalQuestions > 10 || requiredQuestions > 5 || complexTypes > 2) {
      return 'medium';
    } else {
      return 'easy';
    }
  }

  private calculateEstimatedTime(questions: AdvancedQuestion[]): number {
    const timeMap: Record<string, number> = {
      'text': 0.5,
      'paragraph': 2,
      'multiple_choice': 0.3,
      'checkbox': 0.5,
      'dropdown': 0.3,
      'linear_scale': 0.2,
      'date': 0.5,
      'time': 0.5,
      'file_upload': 1
    };
    
    return Math.ceil(questions.reduce((total, question) => {
      return total + (timeMap[question.type] || 0.5);
    }, 0));
  }

  private extractKeywords(
    questions: AdvancedQuestion[], 
    name: string, 
    description: string
  ): string[] {
    const keywords = new Set<string>();
    
    // Extract from name and description
    const text = `${name} ${description}`.toLowerCase();
    const commonKeywords = [
      'survey', 'feedback', 'application', 'registration', 'contact',
      'customer', 'employee', 'product', 'service', 'event',
      'satisfaction', 'experience', 'rating', 'review', 'opinion'
    ];
    
    commonKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.add(keyword);
      }
    });
    
    // Extract from questions
    questions.forEach(question => {
      const questionText = question.question.toLowerCase();
      if (questionText.includes('name')) keywords.add('name');
      if (questionText.includes('email')) keywords.add('email');
      if (questionText.includes('phone')) keywords.add('phone');
      if (questionText.includes('address')) keywords.add('address');
      if (questionText.includes('age')) keywords.add('age');
      if (questionText.includes('rating')) keywords.add('rating');
      if (questionText.includes('satisfaction')) keywords.add('satisfaction');
    });
    
    return Array.from(keywords);
  }

  private extractFeatures(questions: AdvancedQuestion[]): string[] {
    const features = new Set<string>();
    
    const typeFeatures: Record<string, string> = {
      'text': 'Text input',
      'paragraph': 'Long text',
      'multiple_choice': 'Multiple choice',
      'checkbox': 'Checkboxes',
      'dropdown': 'Dropdown selection',
      'linear_scale': 'Rating scale',
      'date': 'Date picker',
      'time': 'Time picker',
      'file_upload': 'File upload'
    };
    
    questions.forEach(question => {
      const feature = typeFeatures[question.type];
      if (feature) {
        features.add(feature);
      }
    });
    
    return Array.from(features);
  }

  private validateTemplate(template: FormTemplate): boolean {
    return !!(
      template.id &&
      template.name &&
      template.description &&
      template.category &&
      template.config &&
      template.matching &&
      template.preview
    );
  }

  // Built-in Template Creators

  private createCustomerSatisfactionTemplate(): FormTemplate {
    return {
      id: 'customer-satisfaction',
      name: 'Customer Satisfaction Survey',
      description: 'Comprehensive customer satisfaction survey with rating scales and feedback',
      category: 'survey',
      tags: ['customer', 'satisfaction', 'rating', 'feedback', 'service'],
      difficulty: 'medium',
      estimatedTime: 5,
      popularity: 95,
      lastUpdated: '2024-01-15',
      author: 'System',
      version: '1.2.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.rating', 'weighted-choice'],
          ['entry.satisfaction', 'smart-choice'],
          ['entry.feedback', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.name', 'John Doe'],
          ['entry.email', 'customer@example.com']
        ]),
        executionSettings: {
          runs: 10,
          delayBetweenRuns: 2000,
          headless: false
        }
      },
      matching: {
        keywords: ['customer', 'satisfaction', 'rating', 'feedback', 'service', 'experience'],
        questionTypes: ['multiple_choice', 'linear_scale', 'paragraph'],
        minQuestions: 5,
        maxQuestions: 15,
        requiredFields: ['entry.rating', 'entry.satisfaction']
      },
      preview: {
        description: 'Perfect for measuring customer satisfaction with products or services',
        features: ['Rating scales', 'Multiple choice', 'Text feedback', 'Email collection'],
        useCases: ['Post-purchase surveys', 'Service feedback', 'Product reviews']
      }
    };
  }

  private createEmployeeFeedbackTemplate(): FormTemplate {
    return {
      id: 'employee-feedback',
      name: 'Employee Feedback Form',
      description: 'Internal employee feedback and satisfaction survey',
      category: 'survey',
      tags: ['employee', 'feedback', 'workplace', 'satisfaction', 'internal'],
      difficulty: 'medium',
      estimatedTime: 8,
      popularity: 88,
      lastUpdated: '2024-01-10',
      author: 'System',
      version: '1.1.0',
      config: {
        fillStrategies: new Map([
          ['entry.department', 'smart-choice'],
          ['entry.role', 'smart-choice'],
          ['entry.satisfaction', 'weighted-choice'],
          ['entry.recommendation', 'smart-choice'],
          ['entry.feedback', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.department', 'Engineering'],
          ['entry.role', 'Software Developer']
        ]),
        executionSettings: {
          runs: 5,
          delayBetweenRuns: 3000,
          headless: true
        }
      },
      matching: {
        keywords: ['employee', 'feedback', 'workplace', 'satisfaction', 'internal', 'team'],
        questionTypes: ['multiple_choice', 'checkbox', 'paragraph'],
        minQuestions: 8,
        maxQuestions: 20,
        requiredFields: ['entry.department', 'entry.satisfaction']
      },
      preview: {
        description: 'Designed for internal employee feedback and workplace satisfaction',
        features: ['Department selection', 'Role identification', 'Satisfaction ratings', 'Anonymous feedback'],
        useCases: ['Annual reviews', 'Exit interviews', 'Team feedback', 'Workplace surveys']
      }
    };
  }

  private createJobApplicationTemplate(): FormTemplate {
    return {
      id: 'job-application',
      name: 'Job Application Form',
      description: 'Standard job application with personal info, experience, and qualifications',
      category: 'application',
      tags: ['job', 'application', 'employment', 'career', 'resume'],
      difficulty: 'hard',
      estimatedTime: 15,
      popularity: 92,
      lastUpdated: '2024-01-20',
      author: 'System',
      version: '2.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.phone', 'pattern-text'],
          ['entry.experience', 'realistic-text'],
          ['entry.education', 'realistic-text'],
          ['entry.skills', 'smart-choice'],
          ['entry.resume', 'smart-file']
        ]),
        customValues: new Map([
          ['entry.name', 'John Doe'],
          ['entry.email', 'john.doe@email.com'],
          ['entry.phone', '+1-555-0123'],
          ['entry.resume', 'resume.pdf']
        ]),
        executionSettings: {
          runs: 3,
          delayBetweenRuns: 5000,
          headless: false
        }
      },
      matching: {
        keywords: ['job', 'application', 'employment', 'career', 'position', 'candidate'],
        questionTypes: ['text', 'paragraph', 'multiple_choice', 'file_upload'],
        minQuestions: 10,
        maxQuestions: 25,
        requiredFields: ['entry.name', 'entry.email', 'entry.experience']
      },
      preview: {
        description: 'Comprehensive job application form with all standard fields',
        features: ['Personal information', 'Work experience', 'Education', 'Skills assessment', 'File uploads'],
        useCases: ['Job applications', 'Internship applications', 'Volunteer positions']
      }
    };
  }

  private createEventRegistrationTemplate(): FormTemplate {
    return {
      id: 'event-registration',
      name: 'Event Registration Form',
      description: 'Event registration with attendee info and preferences',
      category: 'registration',
      tags: ['event', 'registration', 'attendee', 'ticket', 'conference'],
      difficulty: 'easy',
      estimatedTime: 3,
      popularity: 90,
      lastUpdated: '2024-01-12',
      author: 'System',
      version: '1.3.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.phone', 'pattern-text'],
          ['entry.dietary', 'smart-choice'],
          ['entry.accommodation', 'smart-choice']
        ]),
        customValues: new Map([
          ['entry.name', 'Jane Smith'],
          ['entry.email', 'jane.smith@email.com']
        ]),
        executionSettings: {
          runs: 20,
          delayBetweenRuns: 1500,
          headless: true
        }
      },
      matching: {
        keywords: ['event', 'registration', 'attendee', 'ticket', 'conference', 'workshop'],
        questionTypes: ['text', 'multiple_choice', 'checkbox'],
        minQuestions: 5,
        maxQuestions: 12,
        requiredFields: ['entry.name', 'entry.email']
      },
      preview: {
        description: 'Quick and easy event registration form',
        features: ['Contact information', 'Dietary preferences', 'Accommodation needs', 'Event preferences'],
        useCases: ['Conferences', 'Workshops', 'Seminars', 'Social events']
      }
    };
  }

  private createContactFormTemplate(): FormTemplate {
    return {
      id: 'contact-form',
      name: 'Contact Form',
      description: 'Simple contact form for inquiries and support requests',
      category: 'contact',
      tags: ['contact', 'inquiry', 'support', 'message', 'help'],
      difficulty: 'easy',
      estimatedTime: 2,
      popularity: 85,
      lastUpdated: '2024-01-08',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.subject', 'realistic-text'],
          ['entry.message', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.name', 'Contact User'],
          ['entry.email', 'contact@example.com'],
          ['entry.subject', 'General Inquiry']
        ]),
        executionSettings: {
          runs: 15,
          delayBetweenRuns: 2000,
          headless: true
        }
      },
      matching: {
        keywords: ['contact', 'inquiry', 'support', 'message', 'help', 'question'],
        questionTypes: ['text', 'paragraph'],
        minQuestions: 3,
        maxQuestions: 8,
        requiredFields: ['entry.name', 'entry.email', 'entry.message']
      },
      preview: {
        description: 'Basic contact form for customer inquiries',
        features: ['Contact information', 'Subject line', 'Message field', 'Quick submission'],
        useCases: ['Customer support', 'General inquiries', 'Sales questions', 'Feedback']
      }
    };
  }

  // Additional template creators...
  private createProductFeedbackTemplate(): FormTemplate {
    return {
      id: 'product-feedback',
      name: 'Product Feedback Survey',
      description: 'Product-specific feedback and improvement suggestions',
      category: 'feedback',
      tags: ['product', 'feedback', 'improvement', 'feature', 'rating'],
      difficulty: 'medium',
      estimatedTime: 6,
      popularity: 87,
      lastUpdated: '2024-01-18',
      author: 'System',
      version: '1.1.0',
      config: {
        fillStrategies: new Map([
          ['entry.product', 'smart-choice'],
          ['entry.rating', 'weighted-choice'],
          ['entry.features', 'smart-choice'],
          ['entry.improvement', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.product', 'Product A'],
          ['entry.rating', '4']
        ]),
        executionSettings: {
          runs: 12,
          delayBetweenRuns: 2500,
          headless: true
        }
      },
      matching: {
        keywords: ['product', 'feedback', 'improvement', 'feature', 'rating', 'review'],
        questionTypes: ['multiple_choice', 'checkbox', 'linear_scale', 'paragraph'],
        minQuestions: 6,
        maxQuestions: 15,
        requiredFields: ['entry.product', 'entry.rating']
      },
      preview: {
        description: 'Focused on product-specific feedback and feature requests',
        features: ['Product selection', 'Feature ratings', 'Improvement suggestions', 'Usage feedback'],
        useCases: ['Product launches', 'Feature testing', 'User research', 'Product improvements']
      }
    };
  }

  private createEventFeedbackTemplate(): FormTemplate {
    return {
      id: 'event-feedback',
      name: 'Event Feedback Form',
      description: 'Post-event feedback and evaluation survey',
      category: 'feedback',
      tags: ['event', 'feedback', 'evaluation', 'satisfaction', 'improvement'],
      difficulty: 'medium',
      estimatedTime: 4,
      popularity: 82,
      lastUpdated: '2024-01-14',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.event', 'smart-choice'],
          ['entry.rating', 'weighted-choice'],
          ['entry.speakers', 'smart-choice'],
          ['entry.feedback', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.event', 'Annual Conference 2024'],
          ['entry.rating', '4']
        ]),
        executionSettings: {
          runs: 8,
          delayBetweenRuns: 3000,
          headless: true
        }
      },
      matching: {
        keywords: ['event', 'feedback', 'evaluation', 'satisfaction', 'conference', 'workshop'],
        questionTypes: ['multiple_choice', 'linear_scale', 'paragraph'],
        minQuestions: 5,
        maxQuestions: 12,
        requiredFields: ['entry.event', 'entry.rating']
      },
      preview: {
        description: 'Post-event evaluation and feedback collection',
        features: ['Event rating', 'Speaker evaluation', 'Content feedback', 'Improvement suggestions'],
        useCases: ['Conferences', 'Workshops', 'Seminars', 'Training sessions']
      }
    };
  }

  private createScholarshipApplicationTemplate(): FormTemplate {
    return {
      id: 'scholarship-application',
      name: 'Scholarship Application',
      description: 'Academic scholarship application with essays and documentation',
      category: 'application',
      tags: ['scholarship', 'academic', 'education', 'financial aid', 'essay'],
      difficulty: 'hard',
      estimatedTime: 20,
      popularity: 78,
      lastUpdated: '2024-01-16',
      author: 'System',
      version: '1.2.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.gpa', 'realistic-text'],
          ['entry.essay', 'ai-generated-text'],
          ['entry.transcript', 'smart-file']
        ]),
        customValues: new Map([
          ['entry.name', 'Student Applicant'],
          ['entry.email', 'student@university.edu'],
          ['entry.gpa', '3.8'],
          ['entry.transcript', 'transcript.pdf']
        ]),
        executionSettings: {
          runs: 2,
          delayBetweenRuns: 10000,
          headless: false
        }
      },
      matching: {
        keywords: ['scholarship', 'academic', 'education', 'financial aid', 'essay', 'student'],
        questionTypes: ['text', 'paragraph', 'file_upload'],
        minQuestions: 8,
        maxQuestions: 20,
        requiredFields: ['entry.name', 'entry.email', 'entry.essay']
      },
      preview: {
        description: 'Comprehensive scholarship application with academic requirements',
        features: ['Academic information', 'Essay responses', 'Document uploads', 'Financial need assessment'],
        useCases: ['University scholarships', 'Merit-based awards', 'Need-based aid', 'Academic competitions']
      }
    };
  }

  private createVolunteerApplicationTemplate(): FormTemplate {
    return {
      id: 'volunteer-application',
      name: 'Volunteer Application',
      description: 'Volunteer position application with availability and skills',
      category: 'application',
      tags: ['volunteer', 'nonprofit', 'community', 'service', 'availability'],
      difficulty: 'medium',
      estimatedTime: 8,
      popularity: 75,
      lastUpdated: '2024-01-11',
      author: 'System',
      version: '1.1.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.skills', 'smart-choice'],
          ['entry.availability', 'smart-choice'],
          ['entry.motivation', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.name', 'Volunteer Applicant'],
          ['entry.email', 'volunteer@example.com']
        ]),
        executionSettings: {
          runs: 5,
          delayBetweenRuns: 4000,
          headless: true
        }
      },
      matching: {
        keywords: ['volunteer', 'nonprofit', 'community', 'service', 'availability', 'help'],
        questionTypes: ['text', 'multiple_choice', 'checkbox', 'paragraph'],
        minQuestions: 6,
        maxQuestions: 15,
        requiredFields: ['entry.name', 'entry.email', 'entry.availability']
      },
      preview: {
        description: 'Volunteer application with skills and availability assessment',
        features: ['Contact information', 'Skills assessment', 'Availability schedule', 'Motivation statement'],
        useCases: ['Nonprofit organizations', 'Community service', 'Event volunteering', 'Charity work']
      }
    };
  }

  private createWorkshopRegistrationTemplate(): FormTemplate {
    return {
      id: 'workshop-registration',
      name: 'Workshop Registration',
      description: 'Educational workshop registration with skill level assessment',
      category: 'registration',
      tags: ['workshop', 'education', 'training', 'skill', 'learning'],
      difficulty: 'easy',
      estimatedTime: 4,
      popularity: 80,
      lastUpdated: '2024-01-13',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.skill_level', 'smart-choice'],
          ['entry.experience', 'smart-choice']
        ]),
        customValues: new Map([
          ['entry.name', 'Workshop Participant'],
          ['entry.email', 'participant@example.com']
        ]),
        executionSettings: {
          runs: 15,
          delayBetweenRuns: 2000,
          headless: true
        }
      },
      matching: {
        keywords: ['workshop', 'education', 'training', 'skill', 'learning', 'course'],
        questionTypes: ['text', 'multiple_choice'],
        minQuestions: 4,
        maxQuestions: 10,
        requiredFields: ['entry.name', 'entry.email']
      },
      preview: {
        description: 'Workshop registration with skill assessment',
        features: ['Contact information', 'Skill level assessment', 'Experience evaluation', 'Learning goals'],
        useCases: ['Technical workshops', 'Professional development', 'Skill training', 'Educational courses']
      }
    };
  }

  private createNewsletterSignupTemplate(): FormTemplate {
    return {
      id: 'newsletter-signup',
      name: 'Newsletter Signup',
      description: 'Simple newsletter subscription with preferences',
      category: 'registration',
      tags: ['newsletter', 'subscription', 'email', 'marketing', 'preferences'],
      difficulty: 'easy',
      estimatedTime: 1,
      popularity: 88,
      lastUpdated: '2024-01-09',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.email', 'pattern-text'],
          ['entry.name', 'realistic-text'],
          ['entry.interests', 'smart-choice']
        ]),
        customValues: new Map([
          ['entry.email', 'subscriber@example.com'],
          ['entry.name', 'Newsletter Subscriber']
        ]),
        executionSettings: {
          runs: 50,
          delayBetweenRuns: 1000,
          headless: true
        }
      },
      matching: {
        keywords: ['newsletter', 'subscription', 'email', 'marketing', 'signup', 'subscribe'],
        questionTypes: ['text', 'checkbox'],
        minQuestions: 2,
        maxQuestions: 6,
        requiredFields: ['entry.email']
      },
      preview: {
        description: 'Quick newsletter subscription with interest preferences',
        features: ['Email collection', 'Interest preferences', 'Frequency selection', 'Quick signup'],
        useCases: ['Email marketing', 'Content subscriptions', 'News updates', 'Promotional campaigns']
      }
    };
  }

  private createSupportRequestTemplate(): FormTemplate {
    return {
      id: 'support-request',
      name: 'Support Request Form',
      description: 'Technical support and help request form',
      category: 'contact',
      tags: ['support', 'help', 'technical', 'issue', 'ticket'],
      difficulty: 'easy',
      estimatedTime: 3,
      popularity: 83,
      lastUpdated: '2024-01-17',
      author: 'System',
      version: '1.1.0',
      config: {
        fillStrategies: new Map([
          ['entry.name', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.issue_type', 'smart-choice'],
          ['entry.description', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.name', 'Support User'],
          ['entry.email', 'support@example.com'],
          ['entry.issue_type', 'Technical Issue']
        ]),
        executionSettings: {
          runs: 10,
          delayBetweenRuns: 3000,
          headless: true
        }
      },
      matching: {
        keywords: ['support', 'help', 'technical', 'issue', 'ticket', 'problem'],
        questionTypes: ['text', 'multiple_choice', 'paragraph'],
        minQuestions: 4,
        maxQuestions: 10,
        requiredFields: ['entry.name', 'entry.email', 'entry.description']
      },
      preview: {
        description: 'Technical support request with issue categorization',
        features: ['Issue categorization', 'Priority selection', 'Detailed description', 'Contact information'],
        useCases: ['Customer support', 'Technical help', 'Bug reports', 'Feature requests']
      }
    };
  }

  private createQuoteRequestTemplate(): FormTemplate {
    return {
      id: 'quote-request',
      name: 'Quote Request Form',
      description: 'Business quote and pricing request form',
      category: 'contact',
      tags: ['quote', 'pricing', 'business', 'service', 'estimate'],
      difficulty: 'medium',
      estimatedTime: 5,
      popularity: 79,
      lastUpdated: '2024-01-19',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.company', 'realistic-text'],
          ['entry.contact', 'realistic-text'],
          ['entry.email', 'pattern-text'],
          ['entry.service', 'smart-choice'],
          ['entry.budget', 'smart-choice']
        ]),
        customValues: new Map([
          ['entry.company', 'Business Corp'],
          ['entry.contact', 'Business Contact'],
          ['entry.email', 'business@example.com']
        ]),
        executionSettings: {
          runs: 8,
          delayBetweenRuns: 4000,
          headless: true
        }
      },
      matching: {
        keywords: ['quote', 'pricing', 'business', 'service', 'estimate', 'cost'],
        questionTypes: ['text', 'multiple_choice', 'paragraph'],
        minQuestions: 6,
        maxQuestions: 15,
        requiredFields: ['entry.company', 'entry.contact', 'entry.email']
      },
      preview: {
        description: 'Business quote request with service and budget details',
        features: ['Company information', 'Service requirements', 'Budget range', 'Timeline preferences'],
        useCases: ['Service quotes', 'Project estimates', 'Business proposals', 'Pricing requests']
      }
    };
  }

  private createResearchSurveyTemplate(): FormTemplate {
    return {
      id: 'research-survey',
      name: 'Research Survey',
      description: 'Academic or market research survey with demographics',
      category: 'custom',
      tags: ['research', 'academic', 'demographics', 'data', 'study'],
      difficulty: 'hard',
      estimatedTime: 12,
      popularity: 72,
      lastUpdated: '2024-01-21',
      author: 'System',
      version: '1.0.0',
      config: {
        fillStrategies: new Map([
          ['entry.age', 'realistic-date'],
          ['entry.gender', 'smart-choice'],
          ['entry.education', 'smart-choice'],
          ['entry.income', 'smart-choice'],
          ['entry.responses', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.age', '25-34'],
          ['entry.gender', 'Prefer not to say'],
          ['entry.education', 'Bachelor\'s degree']
        ]),
        executionSettings: {
          runs: 3,
          delayBetweenRuns: 8000,
          headless: true
        }
      },
      matching: {
        keywords: ['research', 'academic', 'demographics', 'data', 'study', 'survey'],
        questionTypes: ['multiple_choice', 'checkbox', 'linear_scale', 'paragraph'],
        minQuestions: 15,
        maxQuestions: 30,
        requiredFields: ['entry.age', 'entry.gender']
      },
      preview: {
        description: 'Comprehensive research survey with demographic data',
        features: ['Demographic questions', 'Behavioral assessments', 'Opinion scales', 'Open-ended responses'],
        useCases: ['Academic research', 'Market research', 'Social studies', 'Behavioral analysis']
      }
    };
  }

  private createMarketResearchTemplate(): FormTemplate {
    return {
      id: 'market-research',
      name: 'Market Research Survey',
      description: 'Market research with product preferences and buying behavior',
      category: 'custom',
      tags: ['market', 'research', 'product', 'preferences', 'buying'],
      difficulty: 'hard',
      estimatedTime: 10,
      popularity: 76,
      lastUpdated: '2024-01-22',
      author: 'System',
      version: '1.1.0',
      config: {
        fillStrategies: new Map([
          ['entry.demographics', 'smart-choice'],
          ['entry.preferences', 'smart-choice'],
          ['entry.buying_behavior', 'smart-choice'],
          ['entry.brand_awareness', 'smart-choice'],
          ['entry.feedback', 'ai-generated-text']
        ]),
        customValues: new Map([
          ['entry.demographics', '25-34 years old'],
          ['entry.preferences', 'Quality over price']
        ]),
        executionSettings: {
          runs: 5,
          delayBetweenRuns: 6000,
          headless: true
        }
      },
      matching: {
        keywords: ['market', 'research', 'product', 'preferences', 'buying', 'brand'],
        questionTypes: ['multiple_choice', 'checkbox', 'linear_scale', 'paragraph'],
        minQuestions: 12,
        maxQuestions: 25,
        requiredFields: ['entry.demographics', 'entry.preferences']
      },
      preview: {
        description: 'Market research focused on product preferences and buying behavior',
        features: ['Demographic profiling', 'Product preferences', 'Buying behavior analysis', 'Brand awareness'],
        useCases: ['Product development', 'Market analysis', 'Consumer research', 'Brand positioning']
      }
    };
  }
}
