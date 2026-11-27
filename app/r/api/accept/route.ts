import { after, NextResponse } from 'next/server';
import { alertFor } from '@/lib/alerts';
import { appOrigin } from '@/lib/origin';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';
import { validateAcceptance } from '@/lib/acceptance-core';
import { readJson, rememberVisitor, resolveVisit } from '@/lib/room-visit';
import { createAdminSupabase } from '@/lib/supabase/admin';

const fail = (code: string, status = 400) => NextResponse.json({ ok: false, error: code }, { status });

const ipOf = (headers: Headers) => (headers.get('x-forwarded-for') ?? '').split(',')[0].trim().slice(0, 64) || null;

/** Accept and sign the room's proposal. The buyer gets one audited row per room, replaced on re-sign. */
export async function POST(request: Request) {
  // Signing is deliberate, but keep the door shut to scripted signatures.
  if (!(await withinLimit(request.headers, 'accept-write', 20, 600))) return tooManyRequests();
  const body = await readJson(request);
  const visit = body ? await resolveVisit(body.workspace, body.track) : null;
  if (!body || !visit) return fail(body ? 'not_available' : 'bad_request');
  const parsed = validateAcceptance(body);
  if (!parsed.ok) return fail(parsed.error === 'name_required' ? 'identity_invalid' : parsed.error === 'email_invalid' ? 'identity_invalid' : 'bad_request');
  // Only the server may call the function that stores a signature.
  const { data, error } = await createAdminSupabase().rpc('room_accept', {
    p_session: visit.session,
    p_name: parsed.value.name,
    p_email: parsed.value.email,
    p_signature: parsed.value.signature,
    p_statement: parsed.value.statement,
    p_ip: ipOf(request.headers),
    p_user_agent: (request.headers.get('user-agent') ?? '').slice(0, 400),
  });
  if (error || !data) return fail('not_accepted');
  const origin = await appOrigin();
  after(() => alertFor(visit.session, 'accepted', origin));
  const response = NextResponse.json({ ok: true, ...(data as { accepted: boolean; accepted_at: string }) });
  rememberVisitor(response, visit);
  return response;
}
