import { Logger } from '../utils/Logger';
import { AdvancedQuestion } from '../scanner/AdvancedFormScanner';

export interface SmartFillStrategy {
  id: string;
  name: string;
  description: string;
  category: 'text' | 'choice' | 'date' | 'file' | 'custom';
  generateValue(question: AdvancedQuestion, context?: FillContext): Promise<string | string[]>;
  validateValue(value: string | string[], question: AdvancedQuestion): boolean;
}

export interface FillContext {
  formTitle?: string;
  questionIndex: number;
  totalQuestions: number;
  previousAnswers?: Map<string, string>;
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  language: 'en' | 'vi' | 'auto';
  formality: 'formal' | 'casual' | 'auto';
  dataSource: 'realistic' | 'random' | 'pattern';
  includeEmojis: boolean;
  customPatterns?: Map<string, string>;
}

export class SmartFillStrategies {
  private logger: Logger;
  private strategies: Map<string, SmartFillStrategy> = new Map();
  // private _userPreferences: UserPreferences;

  constructor(_userPreferences?: Partial<UserPreferences>) {
    this.logger = new Logger();
    // this._userPreferences = {
    //   language: 'auto',
    //   formality: 'auto',
    //   dataSource: 'realistic',
    //   includeEmojis: false,
    //   ...userPreferences
    // };
    
    this.initializeStrategies();
  }

  private initializeStrategies(): void {
    // Text-based strategies
    this.registerStrategy(new RealisticTextStrategy());
    this.registerStrategy(new PatternTextStrategy());
    this.registerStrategy(new AIGeneratedTextStrategy());
    
    // Choice-based strategies
    this.registerStrategy(new SmartChoiceStrategy());
    this.registerStrategy(new WeightedChoiceStrategy());
    this.registerStrategy(new ContextAwareChoiceStrategy());
    
    // Date/Time strategies
    this.registerStrategy(new RealisticDateStrategy());
    this.registerStrategy(new RecentDateStrategy());
    this.registerStrategy(new FutureDateStrategy());
    
    // File strategies
    this.registerStrategy(new SmartFileStrategy());
    
    // Custom strategies
    this.registerStrategy(new CustomPatternStrategy());
    this.registerStrategy(new ConditionalStrategy());
  }

  private registerStrategy(strategy: SmartFillStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  public async generateValue(
    question: AdvancedQuestion, 
    strategyId: string, 
    context?: FillContext
  ): Promise<string | string[]> {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      this.logger.warn('Strategy not found, using fallback', { strategyId });
      return this.generateFallbackValue(question);
    }

    try {
      const value = await strategy.generateValue(question, context);
      
      // Validate the generated value
      if (!strategy.validateValue(value, question)) {
        this.logger.warn('Generated value failed validation, using fallback', { 
          strategyId, 
          value,
          questionId: question.id 
        });
        return this.generateFallbackValue(question);
      }

      this.logger.info('Value generated successfully', { 
        strategyId, 
        questionId: question.id,
        valueType: typeof value 
      });

      return value;
    } catch (error: any) {
      this.logger.error('Strategy execution failed', { 
        strategyId, 
        error: error?.message || String(error) 
      });
      return this.generateFallbackValue(question);
    }
  }

  public getAvailableStrategies(questionType: string): SmartFillStrategy[] {
    return Array.from(this.strategies.values())
      .filter(strategy => this.isStrategyCompatible(strategy, questionType));
  }

  public getRecommendedStrategy(question: AdvancedQuestion): string {
    // AI-powered recommendation based on question analysis
    const questionText = question.question.toLowerCase();
    
    // Email detection
    if (questionText.includes('email') || questionText.includes('e-mail')) {
      return 'pattern-text';
    }
    
    // Name detection
    if (questionText.includes('name') || questionText.includes('họ tên')) {
      return 'realistic-text';
    }
    
    // Phone detection
    if (questionText.includes('phone') || questionText.includes('số điện thoại')) {
      return 'pattern-text';
    }
    
    // Address detection
    if (questionText.includes('address') || questionText.includes('địa chỉ')) {
      return 'realistic-text';
    }
    
    // Age detection
    if (questionText.includes('age') || questionText.includes('tuổi')) {
      return 'realistic-date';
    }
    
    // Rating/scale detection
    if (question.type === 'linear_scale') {
      return 'weighted-choice';
    }
    
    // Multiple choice with context
    if (question.type === 'multiple_choice' && question.options && question.options.length > 2) {
      return 'context-aware-choice';
    }
    
    // Default recommendations
    switch (question.type) {
      case 'text':
      case 'paragraph':
        return 'realistic-text';
      case 'multiple_choice':
      case 'checkbox':
        return 'smart-choice';
      case 'date':
        return 'realistic-date';
      case 'time':
        return 'realistic-date';
      case 'file_upload':
        return 'smart-file';
      default:
        return 'realistic-text';
    }
  }

  private isStrategyCompatible(strategy: SmartFillStrategy, questionType: string): boolean {
    const compatibility: Record<string, string[]> = {
      'text': ['realistic-text', 'pattern-text', 'ai-generated-text', 'custom-pattern'],
      'paragraph': ['realistic-text', 'ai-generated-text', 'custom-pattern'],
      'multiple_choice': ['smart-choice', 'weighted-choice', 'context-aware-choice'],
      'checkbox': ['smart-choice', 'weighted-choice', 'context-aware-choice'],
      'dropdown': ['smart-choice', 'weighted-choice', 'context-aware-choice'],
      'linear_scale': ['weighted-choice', 'smart-choice'],
      'date': ['realistic-date', 'recent-date', 'future-date'],
      'time': ['realistic-date'],
      'file_upload': ['smart-file']
    };

    return compatibility[questionType]?.includes(strategy.id) || false;
  }

  private generateFallbackValue(question: AdvancedQuestion): string | string[] {
    switch (question.type) {
      case 'text':
        return 'Sample text';
      case 'paragraph':
        return 'This is a sample paragraph response.';
      case 'multiple_choice':
        return question.options?.[0] || 'Option 1';
      case 'checkbox':
        return question.options?.slice(0, Math.min(2, question.options.length)) || ['Option 1'];
      case 'dropdown':
        return question.options?.[0] || 'Option 1';
      case 'linear_scale':
        return '5';
      case 'date':
        return new Date().toISOString().split('T')[0];
      case 'time':
        return '12:00';
      case 'file_upload':
        return 'sample.txt';
      default:
        return 'Sample value';
    }
  }
}

// Strategy Implementations

class RealisticTextStrategy implements SmartFillStrategy {
  id = 'realistic-text';
  name = 'Realistic Text';
  description = 'Generate realistic text based on question context';
  category: 'text' = 'text';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const questionText = question.question.toLowerCase();
    
    // Email generation
    if (questionText.includes('email') || questionText.includes('e-mail')) {
      return this.generateEmail();
    }
    
    // Name generation
    if (questionText.includes('name') || questionText.includes('họ tên')) {
      return this.generateName();
    }
    
    // Phone generation
    if (questionText.includes('phone') || questionText.includes('số điện thoại')) {
      return this.generatePhone();
    }
    
    // Address generation
    if (questionText.includes('address') || questionText.includes('địa chỉ')) {
      return this.generateAddress();
    }
    
    // Company generation
    if (questionText.includes('company') || questionText.includes('công ty')) {
      return this.generateCompany();
    }
    
    // Default realistic text
    return this.generateGenericText();
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  private generateEmail(): string {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'company.com'];
    const names = ['john', 'jane', 'mike', 'sarah', 'david', 'lisa', 'tom', 'anna'];
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${name}${number}@${domain}`;
  }

  private generateName(): string {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Anna', 'Chris', 'Emma'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  private generatePhone(): string {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `(${areaCode}) ${exchange}-${number}`;
  }

  private generateAddress(): string {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Cedar Ln', 'Elm St', 'Maple Dr', 'First St', 'Second Ave'];
    const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
    const street = streets[Math.floor(Math.random() * streets.length)];
    const number = Math.floor(Math.random() * 9999) + 1;
    const city = cities[Math.floor(Math.random() * cities.length)];
    return `${number} ${street}, ${city}`;
  }

  private generateCompany(): string {
    const prefixes = ['Tech', 'Global', 'Advanced', 'Innovative', 'Dynamic', 'Creative', 'Smart', 'Future'];
    const suffixes = ['Solutions', 'Systems', 'Corp', 'Inc', 'LLC', 'Group', 'Enterprises', 'Technologies'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return `${prefix} ${suffix}`;
  }

  private generateGenericText(): string {
    const templates = [
      'This is a sample response for the question.',
      'Here is my answer to this question.',
      'I would like to provide the following information.',
      'Based on my experience, I believe that...',
      'This is an important topic that requires consideration.'
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
}

class PatternTextStrategy implements SmartFillStrategy {
  id = 'pattern-text';
  name = 'Pattern Text';
  description = 'Generate text based on configurable patterns';
  category: 'text' = 'text';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const questionText = question.question.toLowerCase();
    
    // Email pattern
    if (questionText.includes('email')) {
      return this.generatePatternEmail();
    }
    
    // Phone pattern
    if (questionText.includes('phone')) {
      return this.generatePatternPhone();
    }
    
    // ID pattern
    if (questionText.includes('id') || questionText.includes('number')) {
      return this.generatePatternId();
    }
    
    // URL pattern
    if (questionText.includes('url') || questionText.includes('website')) {
      return this.generatePatternUrl();
    }
    
    // Default pattern
    return this.generatePatternText();
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    return typeof value === 'string' && value.length > 0;
  }

  private generatePatternEmail(): string {
    const timestamp = Date.now();
    return `user${timestamp}@example.com`;
  }

  private generatePatternPhone(): string {
    const timestamp = Date.now().toString().slice(-10);
    return `+1-${timestamp.slice(0, 3)}-${timestamp.slice(3, 6)}-${timestamp.slice(6)}`;
  }

  private generatePatternId(): string {
    const timestamp = Date.now();
    return `ID-${timestamp}`;
  }

  private generatePatternUrl(): string {
    const timestamp = Date.now();
    return `https://example-${timestamp}.com`;
  }

  private generatePatternText(): string {
    const timestamp = Date.now();
    return `Response-${timestamp}`;
  }
}

class AIGeneratedTextStrategy implements SmartFillStrategy {
  id = 'ai-generated-text';
  name = 'AI Generated Text';
  description = 'Generate contextual text using AI patterns';
  category: 'text' = 'text';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    // Simulate AI-generated content based on question context
    const questionText = question.question.toLowerCase();
    
    if (questionText.includes('feedback') || questionText.includes('comment')) {
      return this.generateFeedback();
    }
    
    if (questionText.includes('suggestion') || questionText.includes('recommendation')) {
      return this.generateSuggestion();
    }
    
    if (questionText.includes('experience') || questionText.includes('opinion')) {
      return this.generateExperience();
    }
    
    return this.generateContextualText(questionText);
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    return typeof value === 'string' && value.length > 10;
  }

  private generateFeedback(): string {
    const feedbacks = [
      'The service was excellent and met all my expectations. I would definitely recommend it to others.',
      'Great experience overall. The team was professional and responsive to my needs.',
      'Very satisfied with the quality and delivery. Will use this service again in the future.',
      'Outstanding service that exceeded my expectations. Highly recommend for anyone looking for quality.',
      'Professional and efficient service. The results were exactly what I was looking for.'
    ];
    return feedbacks[Math.floor(Math.random() * feedbacks.length)];
  }

  private generateSuggestion(): string {
    const suggestions = [
      'I suggest implementing a more user-friendly interface to improve the overall experience.',
      'Consider adding more customization options to better meet individual user needs.',
      'A mobile app version would greatly enhance accessibility and convenience.',
      'Regular updates and new features would help maintain user engagement.',
      'Better documentation and tutorials would help new users get started more easily.'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private generateExperience(): string {
    const experiences = [
      'My experience has been very positive. The platform is intuitive and easy to use.',
      'I have been using this service for several months and it has consistently delivered great results.',
      'The learning curve was minimal and I was able to get productive quickly.',
      'Overall, a very satisfying experience that I would recommend to others.',
      'The support team has been helpful and responsive whenever I had questions.'
    ];
    return experiences[Math.floor(Math.random() * experiences.length)];
  }

  private generateContextualText(questionText: string): string {
    // Generate contextual text based on keywords in the question
    if (questionText.includes('improve') || questionText.includes('better')) {
      return 'I believe there are several areas where improvements could be made to enhance the overall experience.';
    }
    
    if (questionText.includes('challenge') || questionText.includes('problem')) {
      return 'The main challenges I have encountered include technical limitations and user interface complexity.';
    }
    
    if (questionText.includes('future') || questionText.includes('plan')) {
      return 'Looking ahead, I plan to continue using this service and explore additional features.';
    }
    
    return 'This is a thoughtful response that addresses the key points of the question comprehensively.';
  }
}

class SmartChoiceStrategy implements SmartFillStrategy {
  id = 'smart-choice';
  name = 'Smart Choice';
  description = 'Intelligently select options based on context';
  category: 'choice' = 'choice';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string | string[]> {
    if (!question.options || question.options.length === 0) {
      return 'Option 1';
    }

    // Analyze question context for smart selection
    const questionText = question.question.toLowerCase();
    
    // Prefer positive options for satisfaction questions
    if (questionText.includes('satisfied') || questionText.includes('happy') || questionText.includes('good')) {
      return this.selectPositiveOption(question.options);
    }
    
    // Prefer negative options for problem questions
    if (questionText.includes('problem') || questionText.includes('issue') || questionText.includes('difficult')) {
      return this.selectNegativeOption(question.options);
    }
    
    // Prefer middle options for neutral questions
    if (questionText.includes('neutral') || questionText.includes('average')) {
      return this.selectMiddleOption(question.options);
    }
    
    // Default smart selection
    return this.selectSmartOption(question.options, questionText);
  }

  validateValue(value: string | string[], question: AdvancedQuestion): boolean {
    if (!question.options) return false;
    
    if (Array.isArray(value)) {
      return value.every(v => question.options!.includes(v));
    } else {
      return question.options.includes(value);
    }
  }

  private selectPositiveOption(options: string[]): string {
    const positiveKeywords = ['excellent', 'very good', 'great', 'satisfied', 'happy', 'yes', 'agree'];
    for (const option of options) {
      if (positiveKeywords.some(keyword => option.toLowerCase().includes(keyword))) {
        return option;
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  private selectNegativeOption(options: string[]): string {
    const negativeKeywords = ['poor', 'bad', 'unsatisfied', 'disagree', 'no', 'never', 'rarely'];
    for (const option of options) {
      if (negativeKeywords.some(keyword => option.toLowerCase().includes(keyword))) {
        return option;
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  private selectMiddleOption(options: string[]): string {
    const middleIndex = Math.floor(options.length / 2);
    return options[middleIndex];
  }

  private selectSmartOption(options: string[], questionText: string): string {
    // Use keyword matching to select most relevant option
    const keywords = questionText.split(' ').filter(word => word.length > 3);
    
    for (const option of options) {
      const optionWords = option.toLowerCase().split(' ');
      if (keywords.some(keyword => optionWords.includes(keyword))) {
        return option;
      }
    }
    
    return options[Math.floor(Math.random() * options.length)];
  }
}

class WeightedChoiceStrategy implements SmartFillStrategy {
  id = 'weighted-choice';
  name = 'Weighted Choice';
  description = 'Select options with weighted probabilities';
  category: 'choice' = 'choice';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string | string[]> {
    if (!question.options || question.options.length === 0) {
      return 'Option 1';
    }

    // Create weighted selection based on question type
    const weights = this.calculateWeights(question);
    return this.selectWeightedOption(question.options, weights);
  }

  validateValue(value: string | string[], question: AdvancedQuestion): boolean {
    if (!question.options) return false;
    
    if (Array.isArray(value)) {
      return value.every(v => question.options!.includes(v));
    } else {
      return question.options.includes(value);
    }
  }

  private calculateWeights(question: AdvancedQuestion): number[] {
    const options = question.options!;
    const weights: number[] = [];
    
    // Default equal weights
    for (let i = 0; i < options.length; i++) {
      weights.push(1);
    }
    
    // Adjust weights based on question type
    if (question.type === 'linear_scale') {
      // Prefer middle values for scales
      const middle = Math.floor(options.length / 2);
      weights[middle] = 3;
      if (middle > 0) weights[middle - 1] = 2;
      if (middle < options.length - 1) weights[middle + 1] = 2;
    } else {
      // Prefer first few options for multiple choice
      for (let i = 0; i < Math.min(3, options.length); i++) {
        weights[i] = 2;
      }
    }
    
    return weights;
  }

  private selectWeightedOption(options: string[], weights: number[]): string {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return options[i];
      }
    }
    
    return options[options.length - 1];
  }
}

class ContextAwareChoiceStrategy implements SmartFillStrategy {
  id = 'context-aware-choice';
  name = 'Context Aware Choice';
  description = 'Select options based on form context and previous answers';
  category: 'choice' = 'choice';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string | string[]> {
    if (!question.options || question.options.length === 0) {
      return 'Option 1';
    }

    // Use context to make informed choice
    if (_context?.previousAnswers) {
      return this.selectBasedOnContext(question.options, _context);
    }
    
    return this.selectSmartOption(question.options, question.question);
  }

  validateValue(value: string | string[], question: AdvancedQuestion): boolean {
    if (!question.options) return false;
    
    if (Array.isArray(value)) {
      return value.every(v => question.options!.includes(v));
    } else {
      return question.options.includes(value);
    }
  }

  private selectBasedOnContext(options: string[], context: FillContext): string {
    // Analyze previous answers to maintain consistency
    const previousAnswers = Array.from(context.previousAnswers!.values());
    
    // Look for patterns in previous answers
    const positiveAnswers = previousAnswers.filter(answer => 
      ['yes', 'good', 'excellent', 'satisfied', 'agree'].some(keyword => 
        answer.toLowerCase().includes(keyword)
      )
    );
    
    if (positiveAnswers.length > previousAnswers.length / 2) {
      return this.selectPositiveOption(options);
    }
    
    const negativeAnswers = previousAnswers.filter(answer => 
      ['no', 'bad', 'poor', 'disagree', 'unsatisfied'].some(keyword => 
        answer.toLowerCase().includes(keyword)
      )
    );
    
    if (negativeAnswers.length > previousAnswers.length / 2) {
      return this.selectNegativeOption(options);
    }
    
    return options[Math.floor(Math.random() * options.length)];
  }

  private selectPositiveOption(options: string[]): string {
    const positiveKeywords = ['excellent', 'very good', 'great', 'satisfied', 'happy', 'yes', 'agree'];
    for (const option of options) {
      if (positiveKeywords.some(keyword => option.toLowerCase().includes(keyword))) {
        return option;
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  private selectNegativeOption(options: string[]): string {
    const negativeKeywords = ['poor', 'bad', 'unsatisfied', 'disagree', 'no', 'never', 'rarely'];
    for (const option of options) {
      if (negativeKeywords.some(keyword => option.toLowerCase().includes(keyword))) {
        return option;
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  }

  private selectSmartOption(options: string[], questionText: string): string {
    const keywords = questionText.toLowerCase().split(' ').filter(word => word.length > 3);
    
    for (const option of options) {
      const optionWords = option.toLowerCase().split(' ');
      if (keywords.some(keyword => optionWords.includes(keyword))) {
        return option;
      }
    }
    
    return options[Math.floor(Math.random() * options.length)];
  }
}

class RealisticDateStrategy implements SmartFillStrategy {
  id = 'realistic-date';
  name = 'Realistic Date';
  description = 'Generate realistic dates based on context';
  category: 'date' = 'date';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const questionText = question.question.toLowerCase();
    
    if (questionText.includes('birth') || questionText.includes('born')) {
      return this.generateBirthDate();
    }
    
    if (questionText.includes('start') || questionText.includes('begin')) {
      return this.generateStartDate();
    }
    
    if (questionText.includes('end') || questionText.includes('finish')) {
      return this.generateEndDate();
    }
    
    if (questionText.includes('deadline') || questionText.includes('due')) {
      return this.generateDeadlineDate();
    }
    
    return this.generateRecentDate();
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private generateBirthDate(): string {
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - Math.floor(Math.random() * 60) - 18; // 18-78 years old
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1; // Safe day for all months
    return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private generateStartDate(): string {
    const daysAgo = Math.floor(Math.random() * 365); // Within last year
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  private generateEndDate(): string {
    const daysFromNow = Math.floor(Math.random() * 365); // Within next year
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  private generateDeadlineDate(): string {
    const daysFromNow = Math.floor(Math.random() * 30) + 1; // 1-30 days from now
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  private generateRecentDate(): string {
    const daysAgo = Math.floor(Math.random() * 30); // Within last month
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }
}

class RecentDateStrategy implements SmartFillStrategy {
  id = 'recent-date';
  name = 'Recent Date';
  description = 'Generate recent dates (within last month)';
  category: 'date' = 'date';

  async generateValue(_question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const daysAgo = Math.floor(Math.random() * 30); // Within last 30 days
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    const date = new Date(value);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return !isNaN(date.getTime()) && date >= thirtyDaysAgo && date <= now;
  }
}

class FutureDateStrategy implements SmartFillStrategy {
  id = 'future-date';
  name = 'Future Date';
  description = 'Generate future dates (within next month)';
  category: 'date' = 'date';

  async generateValue(_question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const daysFromNow = Math.floor(Math.random() * 30) + 1; // 1-30 days from now
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    const date = new Date(value);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return !isNaN(date.getTime()) && date >= now && date <= thirtyDaysFromNow;
  }
}

class SmartFileStrategy implements SmartFillStrategy {
  id = 'smart-file';
  name = 'Smart File';
  description = 'Generate appropriate file names based on context';
  category: 'file' = 'file';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const questionText = question.question.toLowerCase();
    
    if (questionText.includes('resume') || questionText.includes('cv')) {
      return 'resume.pdf';
    }
    
    if (questionText.includes('photo') || questionText.includes('image') || questionText.includes('picture')) {
      return 'photo.jpg';
    }
    
    if (questionText.includes('document') || questionText.includes('file')) {
      return 'document.pdf';
    }
    
    if (questionText.includes('spreadsheet') || questionText.includes('excel')) {
      return 'data.xlsx';
    }
    
    return 'file.txt';
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    return typeof value === 'string' && value.length > 0 && value.includes('.');
  }
}

class CustomPatternStrategy implements SmartFillStrategy {
  id = 'custom-pattern';
  name = 'Custom Pattern';
  description = 'Generate values based on custom patterns';
  category: 'custom' = 'custom';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    
    // Generate based on question type
    switch (question.type) {
      case 'text':
        return `Custom-${timestamp}-${random}`;
      case 'paragraph':
        return `This is a custom generated response with timestamp ${timestamp} and random number ${random}.`;
      default:
        return `Pattern-${timestamp}`;
    }
  }

  validateValue(value: string, _question: AdvancedQuestion): boolean {
    return typeof value === 'string' && value.length > 0;
  }
}

class ConditionalStrategy implements SmartFillStrategy {
  id = 'conditional';
  name = 'Conditional';
  description = 'Generate values based on conditions and rules';
  category: 'custom' = 'custom';

  async generateValue(question: AdvancedQuestion, _context?: FillContext): Promise<string | string[]> {
    // Implement conditional logic based on question and context
    if (_context?.formTitle?.toLowerCase().includes('survey')) {
      return this.generateSurveyResponse(question);
    }
    
    if (_context?.formTitle?.toLowerCase().includes('application')) {
      return this.generateApplicationResponse(question);
    }
    
    if (_context?.formTitle?.toLowerCase().includes('feedback')) {
      return this.generateFeedbackResponse(question);
    }
    
    return this.generateDefaultResponse(question);
  }

  validateValue(value: string | string[], _question: AdvancedQuestion): boolean {
    if (Array.isArray(value)) {
      return value.every(v => typeof v === 'string' && v.length > 0);
    }
    return typeof value === 'string' && value.length > 0;
  }

  private generateSurveyResponse(question: AdvancedQuestion): string | string[] {
    if (question.type === 'multiple_choice' && question.options) {
      // Prefer positive responses for surveys
      return this.selectPositiveOption(question.options);
    }
    return 'This is a survey response.';
  }

  private generateApplicationResponse(question: AdvancedQuestion): string | string[] {
    if (question.type === 'text' && question.question.toLowerCase().includes('name')) {
      return 'John Doe';
    }
    if (question.type === 'text' && question.question.toLowerCase().includes('email')) {
      return 'john.doe@email.com';
    }
    return 'Application response';
  }

  private generateFeedbackResponse(question: AdvancedQuestion): string | string[] {
    if (question.type === 'paragraph') {
      return 'Thank you for the opportunity to provide feedback. I appreciate the service and would recommend it to others.';
    }
    return 'Positive feedback';
  }

  private generateDefaultResponse(_question: AdvancedQuestion): string | string[] {
    const timestamp = Date.now();
    return `Conditional response ${timestamp}`;
  }

  private selectPositiveOption(options: string[]): string {
    const positiveKeywords = ['excellent', 'very good', 'great', 'satisfied', 'happy', 'yes', 'agree'];
    for (const option of options) {
      if (positiveKeywords.some(keyword => option.toLowerCase().includes(keyword))) {
        return option;
      }
    }
    return options[Math.floor(Math.random() * options.length)];
  }
}
