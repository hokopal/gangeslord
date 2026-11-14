import { createAdminSupabase, serverSecret } from '../supabase/admin';
import { isProvider, listModels, pickDefaultModel, type ProviderId } from './providers';
import { decryptKey, encryptKey } from './crypto';

// Every function here bypasses row-level security. Callers must first confirm that the
// current user belongs to the workspace and holds the role the operation needs.

export type AiStatus = {
  configured: boolean;
  provider: ProviderId;
  last4: string;
  model: string;
  models: string[];
  updatedAt: string | null;
};

const NOT_CONFIGURED: AiStatus = { configured: false, provider: 'anthropic', last4: '', model: '', models: [], updatedAt: null };

/** Whether a key is set, and its non-secret details. Never returns the key itself. */
export async function getAiStatus(workspaceId: string): Promise<AiStatus> {
  const { data } = await createAdminSupabase()
    .from('workspace_ai_settings')
    .select('provider, key_last4, model, models, updated_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!data) return NOT_CONFIGURED;
  return {
    configured: true,
    provider: isProvider(data.provider) ? data.provider : 'anthropic',
    last4: data.key_last4 as string,
    model: data.model as string,
    models: Array.isArray(data.models) ? (data.models as string[]) : [],
    updatedAt: data.updated_at as string,
  };
}

/** Checks the key against the provider, then stores it encrypted. Throws ai_key_format or a provider error. */
export async function saveAiKey(workspaceId: string, userId: string, provider: ProviderId, rawKey: string): Promise<void> {
  const key = rawKey.trim();
  if (key.length < 20 || key.length > 300 || /\s/.test(key)) throw new Error('ai_key_format');
  const models = await listModels(provider, key);
  const admin = createAdminSupabase();
  const { data: existing } = await admin.from('workspace_ai_settings').select('provider, model').eq('workspace_id', workspaceId).maybeSingle();
  // Keep the chosen model only when the provider is unchanged and the model is still offered.
  const previous = existing?.provider === provider ? (existing?.model as string | undefined) : undefined;
  const { error } = await admin.from('workspace_ai_settings').upsert({
    workspace_id: workspaceId,
    provider,
    key_ciphertext: encryptKey(key, serverSecret()),
    key_last4: key.slice(-4),
    model: previous && models.includes(previous) ? previous : pickDefaultModel(provider, models),
    models,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error('ai_failed');
}

export async function setAiModel(workspaceId: string, model: string): Promise<void> {
  const status = await getAiStatus(workspaceId);
  if (!status.configured) throw new Error('ai_not_configured');
  if (!status.models.includes(model)) throw new Error('ai_model_unavailable');
  const { error } = await createAdminSupabase().from('workspace_ai_settings').update({ model }).eq('workspace_id', workspaceId);
  if (error) throw new Error('ai_failed');
}

export async function removeAiKey(workspaceId: string): Promise<void> {
  const { error } = await createAdminSupabase().from('workspace_ai_settings').delete().eq('workspace_id', workspaceId);
  if (error) throw new Error('ai_failed');
}

/** The decrypted key and chosen model, for making a request. Stays on the server. */
export async function loadAiCredentials(workspaceId: string): Promise<{ provider: ProviderId; apiKey: string; model: string }> {
  const { data } = await createAdminSupabase()
    .from('workspace_ai_settings')
    .select('provider, key_ciphertext, model')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!data) throw new Error('ai_not_configured');
  return {
    provider: isProvider(data.provider) ? data.provider : 'anthropic',
    apiKey: decryptKey(data.key_ciphertext as string, serverSecret()),
    model: data.model as string,
  };
}
