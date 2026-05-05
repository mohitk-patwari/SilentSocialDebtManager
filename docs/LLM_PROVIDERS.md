# LLM Providers — Silent Social Debt Manager

## Overview

All language model calls route through a single interface to allow provider swaps without downstream changes.

```typescript
interface LLMProvider {
  classify(message: string): Promise<ClassificationResult>;
  extractCommitments(message: string): Promise<Commitment[]>;
  draftReply(context: ReplyContext): Promise<DraftReply>;
  detectTone(message: string): Promise<ToneProfile>;
}
```

## Providers

### Anthropic (Default)
- Model: Claude 3.5 Sonnet
- Env: `LLM_PROVIDER=anthropic`
- Key: `ANTHROPIC_API_KEY`

### OpenAI (Alternative)
- Model: GPT-4o
- Env: `LLM_PROVIDER=openai`
- Key: `OPENAI_API_KEY`

## Switching Providers

1. Set `LLM_PROVIDER` in `.env`
2. Provide the corresponding API key
3. Restart the backend

## Notes

- Rate limits should be handled with exponential backoff
- All responses must be validated for JSON structure
- Log token usage for cost monitoring
