import { completeAnthropic, listAnthropicModels } from './anthropic';
import type { RequestOptions } from './http';
import { completeCompatible, listCompatibleModels, type CompatibleConfig } from './openai-compatible';

export const PROVIDER_IDS = ['anthropic', 'openai', 'gemini', 'openrouter', 'together', 'groq'] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export function isProvider(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value);
}

type Provider = {
  label: string;
  /** Where the user creates a key. */
  keySource: string;
  keyPlaceholder: string;
  /** Tried in order to choose a default model; the first pattern with a match wins. */
  prefer: RegExp[];
  /** Pick the highest version among matches instead of the first listed. */
  newestByName?: boolean;
  compatible?: CompatibleConfig;
};

export const PROVIDERS: Record<ProviderId, Provider> = {
  anthropic: {
    label: 'Anthropic (Claude)',
    keySource: 'the Anthropic Console',
    keyPlaceholder: 'sk-ant-…',
    prefer: [/sonnet/],
  },
  openai: {
    label: 'OpenAI',
    keySource: 'the OpenAI platform dashboard',
    keyPlaceholder: 'sk-…',
    prefer: [/^gpt-[0-9.]+$/, /^gpt-[0-9.]+-mini$/, /^gpt-/],
    newestByName: true,
    compatible: { baseUrl: 'https://api.openai.com/v1', tokenParam: 'max_completion_tokens', maxTokens: 8000 },
  },
  gemini: {
    label: 'Google Gemini',
    keySource: 'Google AI Studio',
    keyPlaceholder: 'AIza…',
    prefer: [/^gemini-[0-9.]+-flash$/, /^gemini-[0-9.]+-pro$/, /^gemini-.*flash/, /^gemini-/],
    newestByName: true,
    compatible: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      tokenParam: 'max_tokens',
      maxTokens: 8000,
      stripPrefix: 'models/',
    },
  },
  openrouter: {
    label: 'OpenRouter',
    keySource: 'openrouter.ai, under Keys',
    keyPlaceholder: 'sk-or-…',
    prefer: [/^anthropic\/claude.*sonnet/, /^openai\/gpt-/, /^google\/gemini/],
    compatible: { baseUrl: 'https://openrouter.ai/api/v1', tokenParam: 'max_tokens', maxTokens: 4000, keyCheckPath: '/key' },
  },
  together: {
    label: 'Together AI',
    keySource: 'the Together AI dashboard',
    keyPlaceholder: 'API key',
    prefer: [/llama-3\.3-70b-instruct-turbo/i, /llama.*70b.*instruct/i, /llama.*instruct/i],
    compatible: { baseUrl: 'https://api.together.xyz/v1', tokenParam: 'max_tokens', maxTokens: 4000 },
  },
  groq: {
    label: 'Groq',
    keySource: 'the Groq console',
    keyPlaceholder: 'gsk_…',
    prefer: [/llama-3\.3-70b-versatile/, /llama.*70b/, /llama/],
    compatible: { baseUrl: 'https://api.groq.com/openai/v1', tokenParam: 'max_tokens', maxTokens: 4000 },
  },
};

// Model lists include models that cannot write text replies. These are never offered.
const NOT_CHAT = /embed|whisper|tts|audio|image|dall-e|moderation|realtime|transcri|guard|rerank|sora|veo|imagen|video|speech|aqa|robotics|computer-use/i;
const MAX_MODELS = 600;

/** Text-capable model ids this key can use. Also the check that the key works: throws ai_key_invalid if not. */
export async function listModels(provider: ProviderId, apiKey: string, options: RequestOptions = {}): Promise<string[]> {
  const config = PROVIDERS[provider].compatible;
  const ids = config ? await listCompatibleModels(config, apiKey, options) : await listAnthropicModels(apiKey, options);
  const usable = [...new Set(ids)].filter((id) => !NOT_CHAT.test(id)).slice(0, MAX_MODELS);
  if (usable.length === 0) throw new Error('ai_failed');
  return usable;
}

const byVersionDescending = (a: string, b: string) => b.localeCompare(a, 'en', { numeric: true });

/** A reasonable starting model for a provider. The admin can always choose another. */
export function pickDefaultModel(provider: ProviderId, models: readonly string[]): string {
  const { prefer, newestByName } = PROVIDERS[provider];
  for (const pattern of prefer) {
    const matches = models.filter((id) => pattern.test(id));
    if (matches.length > 0) return newestByName ? [...matches].sort(byVersionDescending)[0] : matches[0];
  }
  return models[0];
}

/** Sends one prompt to the workspace's provider and returns the reply text. Throws ai_failed on an empty reply. */
export async function complete(
  provider: ProviderId,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  options: RequestOptions = {},
): Promise<string> {
  const config = PROVIDERS[provider].compatible;
  const text = config
    ? await completeCompatible(config, apiKey, model, system, user, options)
    : await completeAnthropic(apiKey, model, system, user, options);
  if (text === '') throw new Error('ai_empty_reply');
  return text;
}
