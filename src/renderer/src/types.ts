// Shared renderer types mirroring the main-process AnswerPlan contract.

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
  id: string;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  page: number;
}

export interface ScanResult {
  formUrl: string;
  formTitle: string;
  questions: Question[];
  pageCount: number;
  scanMethod: string;
  timestamp: string;
}

export interface AnswerOption {
  value: string;
  weight: number;
}

export interface QuestionPlan {
  id: string;
  page: number;
  type: QuestionType;
  question: string;
  required: boolean;
  options?: string[];
  answers: AnswerOption[];
  minSelections?: number;
  maxSelections?: number;
}

export interface AnswerPlan {
  _instructions: string;
  formUrl: string;
  formTitle: string;
  pageCount: number;
  questions: QuestionPlan[];
}

export interface PlanValidationIssue {
  questionId: string;
  question: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface PlanValidationResult {
  valid: boolean;
  issues: PlanValidationIssue[];
}

export interface ExecutionSettings {
  runs: number;
  delayBetweenRuns: number;
  headless: boolean;
}

export interface FillingProgress {
  currentRun: number;
  totalRuns: number;
  currentQuestion?: string;
  status: 'starting' | 'filling' | 'submitting' | 'completed' | 'error' | 'dry-run';
  message: string;
  successCount: number;
  errorCount: number;
}

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

declare global {
  interface Window {
    electronAPI: {
      scanForm: (formUrl: string) => Promise<ScanResult>;
      buildPlan: (scanResult: ScanResult) => Promise<AnswerPlan>;
      validatePlan: (plan: AnswerPlan) => Promise<PlanValidationResult>;
      exportPlan: (plan: AnswerPlan) => Promise<string | null>;
      importPlan: () => Promise<{ plan: AnswerPlan; validation: PlanValidationResult } | null>;
      saveConfig: (name: string, plan: AnswerPlan, execution: ExecutionSettings) => Promise<string>;
      loadConfig: (name: string) => Promise<{ plan: AnswerPlan; execution: ExecutionSettings }>;
      listConfigs: () => Promise<string[]>;
      startFilling: (payload: {
        plan: AnswerPlan;
        execution: ExecutionSettings;
        dryRun: boolean;
      }) => Promise<FillingResult>;
      openScreenshot: (filePath: string) => Promise<void>;
      onFillingProgress: (callback: (progress: FillingProgress) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
