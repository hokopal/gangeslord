import { aiRequest, type RequestOptions } from './http';

/** What differs between providers that speak the OpenAI chat-completions protocol. */
export type CompatibleConfig = {
  baseUrl: string;
  /** Newer OpenAI models reject max_tokens and require max_completion_tokens. */
  tokenParam: 'max_tokens' | 'max_completion_tokens';
  maxTokens: number;
  /** A path that only succeeds with a valid key, for providers whose model list is public. */
  keyCheckPath?: string;
  /** A prefix the provider puts on listed model ids that should not be sent back, such as "models/". */
  stripPrefix?: string;
};

const headers = (apiKey: string): Record<string, string> => ({ authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' });

type ListedModel = { id?: unknown; type?: unknown };

/** Model ids for this key. Providers that label model kinds have non-chat kinds removed. */
export async function listCompatibleModels(config: CompatibleConfig, apiKey: string, options: RequestOptions = {}): Promise<string[]> {
  const opts = { timeoutMs: 15_000, ...options };
  if (config.keyCheckPath) {
    try {
      await aiRequest(`${config.baseUrl}${config.keyCheckPath}`, { headers: headers(apiKey) }, opts);
    } catch (error) {
      // Only a clear rejection of the key stops here. If the check itself is unavailable,
      // carry on: a bad key will still fail at the first real request.
      if (error instanceof Error && error.message === 'ai_key_invalid') throw error;
    }
  }
  const data = await aiRequest(`${config.baseUrl}/models`, { headers: headers(apiKey) }, opts);
  // Most providers wrap the list as { data: [...] }; some return the array itself.
  const list: ListedModel[] = Array.isArray(data) ? data : Array.isArray((data as { data?: unknown }).data) ? (data as { data: ListedModel[] }).data : [];
  return list
    .filter((m) => typeof m.type !== 'string' || m.type === 'chat' || m.type === 'model')
    .map((m) => m.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .map((id) => (config.stripPrefix && id.startsWith(config.stripPrefix) ? id.slice(config.stripPrefix.length) : id));
}

export async function completeCompatible(
  config: CompatibleConfig,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  options: RequestOptions = {},
): Promise<string> {
  const data = (await aiRequest(
    `${config.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: headers(apiKey),
      body: JSON.stringify({
        model,
        [config.tokenParam]: config.maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    },
    options,
  )) as { choices?: { message?: { content?: unknown } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  // Some providers return the reply as a list of parts.
  if (Array.isArray(content)) {
    return content
      .map((part: { type?: string; text?: unknown }) => (typeof part?.text === 'string' ? part.text : ''))
      .join('\n')
      .trim();
  }
  return '';
}
