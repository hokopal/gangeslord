import { planChange, type PaidPlan } from './billing-core';
import { createAdminSupabase } from './supabase/admin';

// Paddle billing, server side. Keys come from the environment; when they are missing, billing is
// simply off and the plan screen says so.

export type BillingConfig = { enabled: boolean; clientToken: string; sandbox: boolean; prices: Record<PaidPlan, string> };

export function billingConfig(): BillingConfig {
  const prices = { pro: process.env.PADDLE_PRICE_PRO ?? '', business: process.env.PADDLE_PRICE_BUSINESS ?? '' };
  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';
  return {
    enabled: Boolean(clientToken && prices.pro && prices.business && process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET),
    clientToken,
    sandbox: process.env.NEXT_PUBLIC_PADDLE_ENV !== 'production',
    prices,
  };
}

/**
 * Applies one verified Paddle notification. Each is recorded by Paddle's own id first, so a
 * notification delivered twice changes nothing the second time. Returns what it did, for the log.
 */
export async function applyPaddleEvent(event: { event_id?: string; event_type?: string; data?: unknown }): Promise<string> {
  if (!event.event_id || !event.event_type) return 'ignored: not a Paddle notification';
  const change = planChange(event as Parameters<typeof planChange>[0], billingConfig().prices);
  const admin = createAdminSupabase();
  const seen = await admin.from('billing_events').insert({ id: event.event_id, type: event.event_type, workspace_id: change?.workspaceId ?? null });
  if (seen.error) return seen.error.code === '23505' ? 'ignored: already applied' : 'ignored: could not be recorded';
  if (!change) return 'recorded: nothing to change';
  const { data, error } = await admin
    .from('workspaces')
    .update({
      plan: change.plan, subscription_status: change.status, paddle_customer_id: change.customerId, paddle_subscription_id: change.subscriptionId,
      plan_renews_at: change.renewsAt, plan_ends_at: change.endsAt,
    })
    .eq('id', change.workspaceId)
    .select('id');
  if (error || !data || data.length === 0) return 'recorded: workspace not found';
  return `applied: ${change.plan} (${change.status})`;
}

/** A link to Paddle's own page where the customer changes card, plan or cancels. Null when it cannot be made. */
export async function billingPortalUrl(workspaceId: string): Promise<string | null> {
  const { data } = await createAdminSupabase().from('workspaces').select('paddle_customer_id, paddle_subscription_id').eq('id', workspaceId).maybeSingle();
  const key = process.env.PADDLE_API_KEY;
  if (!data?.paddle_customer_id || !key) return null;
  const host = billingConfig().sandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  try {
    const response = await fetch(`${host}/customers/${data.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(data.paddle_subscription_id ? { subscription_ids: [data.paddle_subscription_id] } : {}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const url = ((await response.json()) as { data?: { urls?: { general?: { overview?: string } } } }).data?.urls?.general?.overview;
    return url && url.startsWith('https://') ? url : null;
  } catch {
    return null;
  }
}
