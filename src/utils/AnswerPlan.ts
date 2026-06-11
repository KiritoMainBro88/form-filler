import { Question, QuestionType } from '../scanner/FormScanner';

/**
 * One answer candidate for a question.
 *
 * Semantics of `weight` depend on the question type:
 *  - single-choice (multiple_choice, dropdown, linear_scale) and text/paragraph/date/time:
 *      weight = RELATIVE share. The picker normalises all weights and selects exactly one.
 *      e.g. {Có:90, Không:10} => ~90% "Có".
 *  - checkbox:
 *      weight = INDEPENDENT probability in percent (0..100) that this option gets ticked,
 *      then clamped by minSelections / maxSelections.
 */
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
  /** Options as scanned from the form (for choice-based questions). */
  options?: string[];
  /** Candidate answers with weights. For text types these are free-text values. */
  answers: AnswerOption[];
  /** Checkbox only: minimum number of options to tick. */
  minSelections?: number;
  /** Checkbox only: maximum number of options to tick. */
  maxSelections?: number;
}

export interface AnswerPlan {
  /** Human/AI-facing guide. Ignored by the engine. */
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

const SINGLE_CHOICE_TYPES: QuestionType[] = ['multiple_choice', 'dropdown', 'linear_scale'];
const TEXT_TYPES: QuestionType[] = ['text', 'paragraph'];

export function isSingleChoice(type: QuestionType): boolean {
  return SINGLE_CHOICE_TYPES.includes(type);
}

export function isTextType(type: QuestionType): boolean {
  return TEXT_TYPES.includes(type);
}

const INSTRUCTIONS = [
  'HƯỚNG DẪN CHO AI / NGƯỜI DÙNG:',
  'Đây là kế hoạch trả lời cho một Google Form. Hãy điền nội dung và tỉ lệ vào mảng "answers" của từng câu hỏi, rồi gửi lại file JSON này.',
  '',
  'QUY TẮC THEO LOẠI CÂU HỎI (type):',
  '- multiple_choice / dropdown / linear_scale (chọn 1): mỗi phần tử answers là {"value": <một giá trị nằm trong "options">, "weight": <số>}.',
  '    weight là TỈ LỆ TƯƠNG ĐỐI. Ví dụ [{"value":"Có","weight":90},{"value":"Không","weight":10}] nghĩa là ~90% chọn "Có".',
  '    Tổng weight không bắt buộc bằng 100, hệ thống tự chuẩn hoá.',
  '- checkbox (chọn nhiều): mỗi phần tử answers là {"value": <giá trị trong "options">, "weight": <0..100>}.',
  '    weight là XÁC SUẤT ĐỘC LẬP (phần trăm) option đó được tick. Dùng kèm "minSelections" và "maxSelections".',
  '- text / paragraph (tự luận): answers là DANH SÁCH câu trả lời mẫu, mỗi phần tử {"value": "<nội dung>", "weight": <số tỉ lệ>}.',
  '    Hệ thống sẽ chọn ngẫu nhiên 1 câu theo tỉ lệ. Hãy viết nội dung hợp lý, đúng ngữ cảnh câu hỏi.',
  '    Lưu ý: câu hỏi Email phải có giá trị đúng định dạng email; Họ tên phải ra tên người thật.',
  '- date: value dạng "YYYY-MM-DD". time: value dạng "HH:MM" (24h).',
  '',
  'BẮT BUỘC:',
  '- Câu nào "required": true thì phải có ít nhất 1 answer hợp lệ (weight > 0).',
  '- Với câu chọn 1 / chọn nhiều, "value" phải trùng CHÍNH XÁC một giá trị trong "options" (kể cả dấu, hoa thường).',
  '- KHÔNG đổi "id", "type", "page", "options". Chỉ điền "answers" (và min/max cho checkbox).',
].join('\n');

/**
 * Builds an editable plan template from a scan result. Pre-fills equal weights so the
 * file is runnable as-is, and leaves text answers as a single empty slot for the AI to fill.
 */
export function buildPlanTemplate(
  questions: Question[],
  meta: { formUrl: string; formTitle: string; pageCount: number }
): AnswerPlan {
  const plans: QuestionPlan[] = questions.map((q) => {
    const base: QuestionPlan = {
      id: q.id,
      page: q.page,
      type: q.type,
      question: q.question,
      required: q.required,
      options: q.options,
      answers: [],
    };

    if (isSingleChoice(q.type) && q.options && q.options.length > 0) {
      base.answers = q.options.map((value) => ({ value, weight: 1 }));
    } else if (q.type === 'checkbox' && q.options && q.options.length > 0) {
      base.answers = q.options.map((value) => ({ value, weight: 50 }));
      base.minSelections = q.required ? 1 : 0;
      base.maxSelections = q.options.length;
    } else if (isTextType(q.type)) {
      base.answers = [{ value: '', weight: 1 }];
    } else if (q.type === 'date' || q.type === 'time') {
      base.answers = [{ value: '', weight: 1 }];
    }

    return base;
  });

  return {
    _instructions: INSTRUCTIONS,
    formUrl: meta.formUrl,
    formTitle: meta.formTitle,
    pageCount: meta.pageCount,
    questions: plans,
  };
}

/** Strict validation. Any 'error' issue means the plan must NOT be run. */
export function validatePlan(plan: AnswerPlan): PlanValidationResult {
  const issues: PlanValidationIssue[] = [];

  if (!plan || typeof plan !== 'object') {
    return {
      valid: false,
      issues: [{ questionId: '-', question: '-', severity: 'error', message: 'Plan không phải JSON hợp lệ.' }],
    };
  }
  if (!Array.isArray(plan.questions) || plan.questions.length === 0) {
    return {
      valid: false,
      issues: [{ questionId: '-', question: '-', severity: 'error', message: 'Plan không có câu hỏi nào.' }],
    };
  }

  for (const q of plan.questions) {
    const push = (severity: 'error' | 'warning', message: string) =>
      issues.push({ questionId: q.id || '-', question: q.question || '(không tên)', severity, message });

    if (!q.id || !q.type) {
      push('error', 'Thiếu id hoặc type.');
      continue;
    }
    if (!Array.isArray(q.answers)) {
      push('error', 'Trường "answers" phải là mảng.');
      continue;
    }

    if (q.type === 'file_upload' || q.type === 'unsupported') {
      if (q.required) push('warning', `Loại "${q.type}" không được hỗ trợ tự động, câu này sẽ bị bỏ qua.`);
      continue;
    }

    const optionSet = new Set((q.options || []).map((o) => o));
    const validAnswers = q.answers.filter((a) => a && typeof a.value === 'string');

    if (isSingleChoice(q.type)) {
      for (const a of validAnswers) {
        if (!optionSet.has(a.value)) {
          push('error', `Đáp án "${a.value}" không nằm trong options của câu hỏi.`);
        }
        if (typeof a.weight !== 'number' || a.weight < 0) {
          push('error', `Weight của "${a.value}" phải là số >= 0.`);
        }
      }
      const totalWeight = validAnswers.reduce((s, a) => s + (a.weight > 0 ? a.weight : 0), 0);
      if (q.required && totalWeight <= 0) {
        push('error', 'Câu bắt buộc nhưng không có đáp án nào có weight > 0.');
      }
    } else if (q.type === 'checkbox') {
      for (const a of validAnswers) {
        if (!optionSet.has(a.value)) {
          push('error', `Đáp án "${a.value}" không nằm trong options của câu hỏi.`);
        }
        if (typeof a.weight !== 'number' || a.weight < 0 || a.weight > 100) {
          push('error', `Xác suất của "${a.value}" phải nằm trong 0..100.`);
        }
      }
      const min = q.minSelections ?? 0;
      const max = q.maxSelections ?? (q.options?.length || 0);
      if (min > max) push('error', `minSelections (${min}) lớn hơn maxSelections (${max}).`);
      if (q.required && max < 1) push('error', 'Câu bắt buộc nhưng maxSelections < 1.');
      if (q.required && min < 1) push('warning', 'Câu bắt buộc nên đặt minSelections >= 1 để chắc chắn có lựa chọn.');
    } else if (isTextType(q.type)) {
      const nonEmpty = validAnswers.filter((a) => a.value.trim().length > 0);
      if (q.required && nonEmpty.length === 0) {
        push('error', 'Câu tự luận bắt buộc nhưng chưa có nội dung trả lời.');
      }
      if (isEmailQuestion(q.question)) {
        for (const a of nonEmpty) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.value)) {
            push('error', `Câu Email: "${a.value}" không đúng định dạng email.`);
          }
        }
      }
    } else if (q.type === 'date') {
      for (const a of validAnswers.filter((a) => a.value)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(a.value)) push('error', `Ngày "${a.value}" phải dạng YYYY-MM-DD.`);
      }
      if (q.required && validAnswers.every((a) => !a.value)) push('error', 'Câu ngày bắt buộc nhưng chưa có giá trị.');
    } else if (q.type === 'time') {
      for (const a of validAnswers.filter((a) => a.value)) {
        if (!/^\d{2}:\d{2}$/.test(a.value)) push('error', `Giờ "${a.value}" phải dạng HH:MM.`);
      }
      if (q.required && validAnswers.every((a) => !a.value)) push('error', 'Câu giờ bắt buộc nhưng chưa có giá trị.');
    }
  }

  return { valid: !issues.some((i) => i.severity === 'error'), issues };
}

function isEmailQuestion(question: string): boolean {
  return /email|e-mail|thư điện tử/i.test(question || '');
}

// ---- Weighted selection (used by the filler) ----

/** Picks exactly one value by relative weight. Returns null if no positive-weight option. */
export function pickWeightedSingle(answers: AnswerOption[]): string | null {
  const pool = answers.filter((a) => a && a.weight > 0 && typeof a.value === 'string');
  if (pool.length === 0) return null;
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a.value;
  }
  return pool[pool.length - 1].value;
}

/**
 * Picks a set of checkbox values: each option ticked independently with `weight`% chance,
 * then clamped to [min, max]. If below min, randomly fills from the remaining options.
 */
export function pickCheckboxSet(
  answers: AnswerOption[],
  minSelections: number,
  maxSelections: number
): string[] {
  const valid = answers.filter((a) => a && typeof a.value === 'string');
  const min = Math.max(0, minSelections || 0);
  const max = Math.max(min, maxSelections || valid.length);

  let chosen = valid.filter((a) => Math.random() * 100 < (a.weight ?? 0)).map((a) => a.value);

  // Enforce minimum.
  if (chosen.length < min) {
    const remaining = valid.map((a) => a.value).filter((v) => !chosen.includes(v));
    shuffle(remaining);
    while (chosen.length < min && remaining.length > 0) {
      chosen.push(remaining.pop() as string);
    }
  }

  // Enforce maximum (prefer keeping higher-weight picks).
  if (chosen.length > max) {
    const byWeight = [...chosen].sort((a, b) => weightOf(valid, b) - weightOf(valid, a));
    chosen = byWeight.slice(0, max);
  }

  return chosen;
}

function weightOf(answers: AnswerOption[], value: string): number {
  const found = answers.find((a) => a.value === value);
  return found ? found.weight : 0;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
