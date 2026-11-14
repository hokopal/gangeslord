import { NextResponse } from 'next/server';
import { applyPaddleEvent } from '@/lib/billing';
import { verifyPaddleSignature } from '@/lib/billing-core';

/**
 * Paddle calls this when a subscription starts, changes or ends. Nothing is trusted until the
 * signature checks out against the secret Paddle issued for this address.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const secret = process.env.PADDLE_WEBHOOK_SECRET ?? '';
  if (!verifyPaddleSignature(body, request.headers.get('paddle-signature'), secret, Math.floor(Date.now() / 1000))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event: { event_id?: string; event_type?: string; data?: unknown };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true, result: await applyPaddleEvent(event) });
}
