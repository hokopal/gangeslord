import { aiRequest, type RequestOptions } from './http';

const BASE = 'https://api.anthropic.com/v1';
const VERSION = '2023-06-01';

function headers(apiKey: string): Record<string, string> {
  return { 'x-api-key': apiKey, 'anthropic-version': VERSION, 'content-type': 'application/json' };
}

/** Model ids this key can use, newest first. Doubles as the check that a key works. */
export async function listAnthropicModels(apiKey: string, options: RequestOptions = {}): Promise<string[]> {
  const data = (await aiRequest(`${BASE}/models?limit=100`, { headers: headers(apiKey) }, { timeoutMs: 15_000, ...options })) as {
    data?: { id?: unknown }[];
  };
  return (data.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Sends one prompt and returns the text of the reply. */
export async function completeAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  options: RequestOptions = {},
): Promise<string> {
  const data = (await aiRequest(
    `${BASE}/messages`,
    {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: 'user', content: user }] }),
    },
    options,
  )) as { content?: { type?: string; text?: string }[] };
  return (data.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim();
}
