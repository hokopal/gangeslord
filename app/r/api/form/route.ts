import { after, NextResponse } from 'next/server';
import { syncSubmission } from '@/lib/forms-server';
import { appOrigin } from '@/lib/origin';
import { syncOsActivity } from '@/lib/os-activity';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';
import { cleanSubmission, publicForm } from '@/lib/room-options';
import { readJson, rememberRoomForm, rememberVisitor, resolveVisit } from '@/lib/room-visit';
import { createAdminSupabase } from '@/lib/supabase/admin';

const fail = (code: string, status = 400) => NextResponse.json({ ok: false, error: code }, { status });

/** A buyer submits a room's form. The database decides whether the room has one and whether the visit is real. */
export async function POST(request: Request) {
  // A submission can create records in other tools and trigger emails, so it is the most tightly
  // limited thing a visitor can do: ten an hour from one network address.
  if (!(await withinLimit(request.headers, 'form', 10, 3600))) return tooManyRequests();
  const body = await readJson(request);
  if (!body) return fail('bad_request');
  const country = (request.headers.get('x-vercel-ip-country') ?? '').slice(0, 2) || null;
  const visit = await resolveVisit(body.workspace, body.track, country);
  if (!visit) return fail('not_available');

  const { data: extras } = await visit.supabase.rpc('public_room_extras', { p_workspace: body.workspace, p_track: body.track, p_token: null });
  const form = publicForm((extras as { form?: unknown } | null)?.form ?? null);
  if (!form) return fail('no_form', 404);

  let fields: Record<string, string>;
  try {
    fields = cleanSubmission(form.fields, (body.fields ?? {}) as Record<string, unknown>, { custom: form.custom, consent: form.consent });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'form_incomplete');
  }
  const { data: submissionId } = await createAdminSupabase().rpc('room_submit_form', { p_session: visit.session, p_fields: fields });
  if (!submissionId) return fail('not_accepted');

  const origin = await appOrigin();
  after(async () => {
    await syncSubmission(submissionId as string, origin);
    await syncOsActivity(visit.session, origin, 'form_submitted');
  });

  const response = NextResponse.json({ ok: true });
  // The signed proof is bound to this exact room and works on both canonical and custom hosts.
  rememberRoomForm(response, visit.workspace, visit.track);
  rememberVisitor(response, visit);
  return response;
}
