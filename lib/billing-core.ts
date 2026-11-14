import { createHmac, timingSafeEqual } from 'node:crypto';

// Paddle billing: checking that a notification really came from Paddle, and working out what it
// means for a workspace's plan. No database or network here, so it can be tested directly.

export type PaidPlan = 'pro' | 'business';
export const PRICES: Record<PaidPlan, number> = { pro: 20, business: 49 };
export const TRIAL_DAYS = 7;

const TOLERANCE_SECONDS = 300;

/**
 * Checks Paddle's signature on a notification. The header carries a timestamp and an HMAC of
 * "timestamp:body"; an old timestamp is refused so a captured notification cannot be replayed.
 */
export function verifyPaddleSignature(rawBody: string, header: string | null, secret: string, nowSeconds: number): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(';').map((part) => part.split('=', 2) as [string, string]));
  const ts = Number(parts.ts);
  if (!Number.isInteger(ts) || !parts.h1 || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;
  const expected = createHmac('sha256', secret).update(`${parts.ts}:${rawBody}`).digest();
  const given = Buffer.from(parts.h1, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export type PlanChange = {
  workspaceId: string;
  plan: 'starter' | PaidPlan;
  status: string;
  customerId: string | null;
  subscriptionId: string;
  renewsAt: string | null;
  endsAt: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
type Sub = {
  id?: string; status?: string; customer_id?: string; custom_data?: { workspace_id?: string } | null;
  items?: { price?: { id?: string } }[]; next_billed_at?: string | null; scheduled_change?: { action?: string; effective_at?: string } | null;
};

/**
 * What a subscription notification means for a workspace, or null when it is not one we act on.
 * A subscription that is trialing, active or behind on payment keeps its plan; one that is paused
 * or cancelled puts the workspace back on the free plan.
 */
export function planChange(event: { event_type?: string; data?: Sub }, prices: Record<PaidPlan, string>): PlanChange | null {
  if (!event.event_type?.startsWith('subscription.') || !event.data) return null;
  const sub = event.data;
  const workspaceId = sub.custom_data?.workspace_id ?? '';
  if (!sub.id || !UUID.test(workspaceId)) return null;
  const priceIds = (sub.items ?? []).map((item) => item.price?.id);
  const bought: PaidPlan | null = priceIds.includes(prices.business) && prices.business ? 'business' : priceIds.includes(prices.pro) && prices.pro ? 'pro' : null;
  const status = sub.status ?? 'unknown';
  const paying = status === 'trialing' || status === 'active' || status === 'past_due';
  return {
    workspaceId,
    plan: paying && bought ? bought : 'starter',
    status,
    customerId: sub.customer_id ?? null,
    subscriptionId: sub.id,
    renewsAt: paying ? (sub.next_billed_at ?? null) : null,
    endsAt: sub.scheduled_change?.action === 'cancel' ? (sub.scheduled_change.effective_at ?? null) : null,
  };
}
