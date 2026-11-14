export type RequestOptions = { fetchImpl?: typeof fetch; timeoutMs?: number };

/** Maps an HTTP status from an AI provider to one of our error codes. Provider error text is never passed on. */
export function errorForStatus(status: number): Error {
  if (status === 401 || status === 403) return new Error('ai_key_invalid');
  if (status === 404) return new Error('ai_model_unavailable');
  if (status === 429) return new Error('ai_rate_limited');
  if (status === 400 || status === 422) return new Error('ai_request_rejected');
  if (status === 402) return new Error('ai_no_credit');
  return new Error('ai_failed');
}

/** One JSON request to a provider, with a timeout. Throws one of our error codes. */
export async function aiRequest(url: string, init: RequestInit, { fetchImpl = fetch, timeoutMs = 45_000 }: RequestOptions): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new Error('ai_unreachable');
  }
  if (!response.ok) throw errorForStatus(response.status);
  try {
    return await response.json();
  } catch {
    throw new Error('ai_failed');
  }
}
