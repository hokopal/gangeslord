import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Checkout } from '@/components/billing/Checkout';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { billingConfig } from '@/lib/billing';
import { PLAN_LABEL, PLANS, PRICE_NOTE, priceLabel, TRIAL_DAYS } from '@/lib/plans';
import { can } from '@/lib/roles';
import { createServerSupabase, getUser } from '@/lib/supabase/server';
import { getWorkspaceContext } from '@/lib/workspaces';
import { manageBillingAction } from './actions';

const ERRORS: Record<string, string> = {
  not_allowed: 'Only workspace admins can change the plan.',
  portal: 'The billing page couldn’t be opened just now. Please try again in a moment.',
};
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; checkout?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, checkout } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.read')) notFound();
  const { workspace, role } = context;
  const supabase = await createServerSupabase();
  const [{ data }, user] = await Promise.all([
    supabase.from('workspaces').select('plan, subscription_status, plan_renews_at, plan_ends_at, paddle_subscription_id').eq('id', workspace.id).maybeSingle(),
    getUser(),
  ]);
  const plan = (data?.plan as string | undefined) ?? 'alpha_trial';
  const status = (data?.subscription_status as string | null) ?? null;
  const renews = (data?.plan_renews_at as string | null) ?? null;
  const ends = (data?.plan_ends_at as string | null) ?? null;
  const subscribed = Boolean(data?.paddle_subscription_id) && (plan === 'pro' || plan === 'business');
  const billing = billingConfig();
  const admin = can(role, 'settings.write');

  let state = PRICE_NOTE;
  if (plan === 'alpha_trial') state = 'This workspace joined during early access, so it has everything in Business at no cost for now. You can move to a paid plan whenever you like.';
  else if (subscribed && ends) state = `Your plan has been cancelled and stays active until ${formatDate(ends)}. After that the workspace moves to Starter.`;
  else if (subscribed && status === 'trialing') state = `You are in your ${TRIAL_DAYS}-day free trial.${renews ? ` Your first payment is due on ${formatDate(renews)}.` : ''}`;
  else if (subscribed && status === 'past_due') state = 'Your last payment didn’t go through. Update your card to keep the plan.';
  else if (subscribed && renews) state = `Your plan renews on ${formatDate(renews)}.`;

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/settings`} className="back">
        <ArrowLeft aria-hidden="true" /> Settings
      </Link>
      <h1 className="page-title">Plan</h1>
      <p className="page-subtitle">
        <span className="badge">{PLAN_LABEL[plan] ?? plan}</span> {state}
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {ERRORS[error] ?? 'Something went wrong. Please try again.'}
        </p>
      ) : null}
      {checkout === 'done' ? (
        <p className="notice" role="status">
          Thank you. Your plan updates here within a minute, as soon as the payment provider confirms it. Refresh the page if it hasn’t yet.
        </p>
      ) : null}
      {subscribed && admin ? (
        <form action={manageBillingAction} style={{ marginBottom: 16 }}>
          <input type="hidden" name="workspace" value={workspace.slug} />
          <SubmitButton className="btn" pendingLabel="Opening…">
            Manage billing: card, invoices, switch plan or cancel
          </SubmitButton>
        </form>
      ) : null}

      <div className="plan-grid">
        {PLANS.map((item) => {
          const current = plan === item.id;
          return (
            <section key={item.id} className="plan-card">
              <h2>{item.name}</h2>
              <p className="plan-price">{priceLabel(item)}</p>
              <p className="hint">{item.audience}</p>
              <p className="plan-includes">{item.tracks === null ? 'Unlimited tracks' : `Up to ${item.tracks} tracks`}</p>
              {item.includes ? <p className="plan-includes">{item.includes}</p> : null}
              <ul>
                {item.features.map((feature) => (
                  <li key={feature}>
                    <Check aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {current ? (
                <p className="plan-status">Your current plan</p>
              ) : item.price === 0 ? (
                <p className="plan-status">{subscribed ? 'Cancel under Manage billing to return to Starter' : 'Free for good'}</p>
              ) : subscribed ? (
                <p className="plan-status">Switch under Manage billing</p>
              ) : !billing.enabled ? (
                <p className="plan-status">Paid plans open shortly</p>
              ) : !admin || !user?.email ? (
                <p className="plan-status">Ask a workspace admin to subscribe</p>
              ) : (
                <Checkout
                  label={`Start ${TRIAL_DAYS}-day free trial`}
                  priceId={billing.prices[item.id as 'pro' | 'business']}
                  clientToken={billing.clientToken}
                  sandbox={billing.sandbox}
                  workspaceId={workspace.id}
                  email={user.email}
                  done={`/w/${workspace.slug}/settings/plan?checkout=done`}
                />
              )}
            </section>
          );
        })}
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Payments are handled by Paddle, which sells Pipemouse on our behalf and takes care of tax and invoices. Card details go to
        Paddle and never reach Pipemouse.
      </p>
    </div>
  );
}
