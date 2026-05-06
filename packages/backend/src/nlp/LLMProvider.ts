import { GoogleGenAI } from '@google/genai';

import {
  ClassificationResult,
  Commitment,
  DraftReply,
  LLMProvider as LLMProviderContract,
  ReplyContext,
  ToneProfile,
  ToneType,
} from '../../../shared/types';

type GeminiProviderOptions = {
  model?: string;
};

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const VALID_CLASSIFICATION_TYPES = new Set([
  'unanswered_query',
  'commitment_made',
  'relationship_drift',
  'neutral',
]);
const VALID_TONE_TYPES = new Set<ToneType>([
  'professional',
  'casual',
  'urgent',
  'emotional',
]);

export class GeminiProvider implements LLMProviderContract {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, options: GeminiProviderOptions = {}) {
    this.ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
    });

    this.model = options.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  }

  private safeJSON<T>(label: string, text: string, fallback: T): T {
    try {
      const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      console.error(`\n${label} JSON PARSE FAILED`);
      console.error(text);

      return fallback;
    }
  }

  private async generateJSON(
    label: string,
    prompt: string,
    responseJsonSchema?: unknown
  ): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema,
          temperature: 0.1,
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error(`${label} returned an empty Gemini response`);
      }

      console.log(`\n${label} RAW RESPONSE:\n`, text);

      return text;
    } catch (error) {
      this.logGeminiError(label, error);
      throw error;
    }
  }

  private logGeminiError(label: string, error: unknown): void {
    const errorLike = error as {
      message?: string;
      status?: number;
      statusText?: string;
      errorDetails?: unknown;
    };
    const parsedMessage = this.parseGeminiErrorMessage(errorLike.message);

    console.error(`\n${label} ERROR:`);
    console.error({
      model: this.model,
      status: errorLike.status || parsedMessage?.code,
      statusText: errorLike.statusText,
      message: parsedMessage?.message || errorLike.message,
      errorDetails: errorLike.errorDetails,
    });

    if (errorLike.message?.includes('not found for API version')) {
      console.error(
        `Gemini model "${this.model}" is not available for generateContent on the configured API version.`
      );
    }
  }

  private parseGeminiErrorMessage(
    message: string | undefined
  ): { code?: number; message?: string; status?: string } | undefined {
    if (!message?.startsWith('{')) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(message) as {
        error?: { code?: number; message?: string; status?: string };
      };

      return parsed.error;
    } catch (error) {
      return undefined;
    }
  }

  private normalizeConfidence(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0;
  }

  private normalizeClassification(value: unknown): ClassificationResult {
    const parsed = value as Partial<ClassificationResult>;

    return {
      type: VALID_CLASSIFICATION_TYPES.has(parsed.type || '')
        ? parsed.type!
        : 'neutral',
      confidence: this.normalizeConfidence(parsed.confidence),
    };
  }

  private normalizeCommitments(value: unknown): Commitment[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map((item) => {
      const parsed = item as Partial<Commitment> & { deadline?: string | null };

      return {
        action: typeof parsed.action === 'string' ? parsed.action : '',
        target: typeof parsed.target === 'string' ? parsed.target : '',
        deadline: parsed.deadline ? new Date(parsed.deadline) : null,
        confidence: this.normalizeConfidence(parsed.confidence),
      };
    });
  }

  private normalizeTone(value: unknown): ToneProfile {
    const parsed = value as Partial<ToneProfile>;
    const rawPrimary = (value as { primary?: unknown }).primary;
    const primaryValue = typeof rawPrimary === 'string' ? rawPrimary : undefined;
    const primary =
      primaryValue === 'informal'
        ? 'casual'
        : VALID_TONE_TYPES.has(primaryValue as ToneType)
          ? (primaryValue as ToneType)
          : 'casual';

    return {
      primary,
      secondary: VALID_TONE_TYPES.has(parsed.secondary as ToneType)
        ? parsed.secondary
        : undefined,
      formality_score: this.normalizeConfidence(parsed.formality_score),
      confidence: this.normalizeConfidence(parsed.confidence),
    };
  }

  async classify(message: string): Promise<ClassificationResult> {
    try {
      const prompt = `
You are a classifier API.

Return ONLY valid JSON.

Valid types:
- unanswered_query
- commitment_made
- relationship_drift
- neutral

FORMAT:
{
  "type":"unanswered_query",
  "confidence":0.95
}

MESSAGE:
"${message}"
`;

      const text = await this.generateJSON('CLASSIFICATION', prompt, {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'unanswered_query',
              'commitment_made',
              'relationship_drift',
              'neutral',
            ],
          },
          confidence: { type: 'number' },
        },
        required: ['type', 'confidence'],
      });

      const parsed = this.safeJSON<ClassificationResult>('CLASSIFICATION', text, {
        type: 'neutral',
        confidence: 0,
      });

      return this.normalizeClassification(parsed);
    } catch (error) {
      return {
        type: 'neutral',
        confidence: 0,
      };
    }
  }

  async extractCommitments(message: string): Promise<Commitment[]> {
    try {
      const prompt = `
Extract commitments.

Return ONLY valid JSON array.

FORMAT:
[
 {
  "action":"Send report",
  "target":"John",
  "deadline":null,
  "confidence":0.9
 }
]

MESSAGE:
"${message}"
`;

      const text = await this.generateJSON('COMMITMENT', prompt, {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string' },
            target: { type: 'string' },
            deadline: { type: 'string', nullable: true },
            confidence: { type: 'number' },
          },
          required: ['action', 'target', 'deadline', 'confidence'],
        },
      });

      const parsed = this.safeJSON<Commitment[]>('COMMITMENT', text, []);

      return this.normalizeCommitments(parsed);
    } catch (error) {
      return [];
    }
  }

  async detectTone(message: string): Promise<ToneProfile> {
    try {
      const prompt = `
Detect tone.

Return ONLY valid JSON.

Allowed primary values: professional, casual, urgent, emotional.

FORMAT:
{
  "primary":"professional",
  "formality_score":0.8,
  "confidence":0.9
}

MESSAGE:
"${message}"
`;

      const text = await this.generateJSON('TONE', prompt, {
        type: 'object',
        properties: {
          primary: {
            type: 'string',
            enum: ['professional', 'casual', 'urgent', 'emotional'],
          },
          secondary: {
            type: 'string',
            enum: ['professional', 'casual', 'urgent', 'emotional'],
            nullable: true,
          },
          formality_score: { type: 'number' },
          confidence: { type: 'number' },
        },
        required: ['primary', 'formality_score', 'confidence'],
      });

      const parsed = this.safeJSON<ToneProfile>('TONE', text, {
        primary: 'casual',
        formality_score: 0.5,
        confidence: 0,
      });

      return this.normalizeTone(parsed);
    } catch (error) {
      return {
        primary: 'casual',
        formality_score: 0.5,
        confidence: 0,
      };
    }
  }

  async draftReply(context: ReplyContext): Promise<DraftReply> {
    try {
      const prompt = `
Generate reply.

Return ONLY valid JSON.

FORMAT:
{
  "draft_text":"Sure, I will send it shortly.",
  "confidence":0.92
}

MESSAGE:
"${context.original_message}"

TONE:
${context.detected_tone.primary}
`;

      const text = await this.generateJSON('DRAFT', prompt, {
        type: 'object',
        properties: {
          draft_text: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['draft_text', 'confidence'],
      });

      const parsed = this.safeJSON<any>('DRAFT', text, {
        draft_text: 'Will respond soon.',
        confidence: 0,
      });

      return {
        id: `draft_${Date.now()}`,
        action_id: '',
        original_message_id: '',
        draft_text: parsed.draft_text,
        tone: context.detected_tone,
        confidence: this.normalizeConfidence(parsed.confidence),
        status: 'pending',
        suggested_send_time: new Date(),
      };
    } catch (error) {
      return {
        id: `draft_${Date.now()}`,
        action_id: '',
        original_message_id: '',
        draft_text: 'Will respond soon.',
        tone: context.detected_tone,
        confidence: 0,
        status: 'pending',
      };
    }
  }
}
