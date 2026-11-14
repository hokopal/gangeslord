'use client';

import { useState } from 'react';

type PaddleJs = {
  Environment: { set: (name: 'sandbox') => void };
  Initialize: (options: { token: string; eventCallback?: (event: { name?: string }) => void }) => void;
  Checkout: { open: (options: { items: { priceId: string; quantity: number }[]; customData: Record<string, string>; customer?: { email: string } }) => void };
};
declare global {
  interface Window {
    Paddle?: PaddleJs;
  }
}

const SCRIPT = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let loading: Promise<void> | null = null;

/** Loads Paddle's checkout script once, however many buttons ask for it. */
function loadPaddle(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error('load'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** A button that opens Paddle's checkout for one plan. Card details go to Paddle and never touch Pipemouse. */
export function Checkout({
  label, priceId, clientToken, sandbox, workspaceId, email, done,
}: {
  label: string; priceId: string; clientToken: string; sandbox: boolean; workspaceId: string; email: string;
  /** Where to go once the checkout completes. */
  done: string;
}) {
  const [state, setState] = useState<'idle' | 'opening' | 'failed'>('idle');

  async function open() {
    setState('opening');
    try {
      await loadPaddle();
      const paddle = window.Paddle;
      if (!paddle) throw new Error('missing');
      if (sandbox) paddle.Environment.set('sandbox');
      paddle.Initialize({
        token: clientToken,
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') window.location.assign(done);
        },
      });
      // The workspace travels with the purchase, so the notification Paddle sends back names it.
      paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customData: { workspace_id: workspaceId }, customer: { email } });
      setState('idle');
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <button type="button" className="btn btn-primary btn-block" onClick={open} disabled={state === 'opening'} aria-busy={state === 'opening'}>
        {state === 'opening' ? 'Opening checkout…' : label}
      </button>
      {state === 'failed' ? (
        <p className="notice notice-error" role="alert" style={{ marginTop: 8 }}>
          The checkout couldn’t open. Check that nothing is blocking paddle.com, then try again.
        </p>
      ) : null}
    </>
  );
}
