/**
 * Configuration Module
 * Loads and validates environment variables
 */

export interface Config {
  port: number;
  nodeEnv: string;
  llmProvider: string;
  anthropicApiKey: string;
  openaiApiKey: string;
  whatsappPhoneNumberId: string;
  whatsappApiKey: string;
  whatsappWebhookToken: string;
  telegramBotToken: string;
  gmailClientId: string;
  gmailClientSecret: string;
  gmailRedirectUri: string;
  heartbeatInterval: number;
  actionThreshold: number;
  topN: number;
  dryRun: boolean;
  soulStorePath: string;
  memoryCacheTtl: number;
  logLevel: string;
}

export function loadConfig(): Config {
  return {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    llmProvider: process.env.LLM_PROVIDER || 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    whatsappApiKey: process.env.WHATSAPP_API_KEY || '',
    whatsappWebhookToken: process.env.WHATSAPP_WEBHOOK_TOKEN || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    gmailClientId: process.env.GMAIL_CLIENT_ID || '',
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/gmail/callback',
    heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '1800000'),
    actionThreshold: parseFloat(process.env.ACTION_THRESHOLD || '0.6'),
    topN: parseInt(process.env.TOP_N || '5'),
    dryRun: process.env.DRY_RUN === 'true',
    soulStorePath: process.env.SOUL_STORE_PATH || './souls',
    memoryCacheTtl: parseInt(process.env.MEMORY_CACHE_TTL || '300000'),
    logLevel: process.env.LOG_LEVEL || 'info',
  };
}

export function validateConfig(config: Config): void {
  const required = [
    'nodeEnv',
    'llmProvider',
    'soulStorePath',
  ];

  for (const key of required) {
    if (!config[key as keyof Config]) {
      throw new Error(`Missing required config: ${key}`);
    }
  }

  console.log('[Config] Configuration loaded and validated');
}
