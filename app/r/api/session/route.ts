import { cookies } from 'next/headers';
import { after, NextResponse } from 'next/server';
import { alertFor } from '@/lib/alerts';
import { syncHubspotActivity } from '@/lib/hubspot-activity';
import { appOrigin } from '@/lib/origin';
import { createServerSupabase } from '@/lib/supabase/server';
import { tooManyRequests, withinLimit } from '@/lib/rate-limit';

const VISITOR_COOKIE = 'fello_vid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const str = (value: unknown, max: number) => (typeof value === 'string' && value !== '' ? value.slice(0, max) : null);

/**
 * Starts (or resumes) a buyer's visit to a room. The visitor is recognised by one
 * first-party cookie that the page's scripts cannot read. Draft rooms return no session.
 */
export async function POST(request: Request) {
  if (!(await withinLimit(request.headers, 'session', 120, 60))) return tooManyRequests();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ session: null }, { status: 400 });
  }
  const workspace = str(body.workspace, 80);
  const track = str(body.track, 80);
  if (!workspace || !track) return NextResponse.json({ session: null }, { status: 400 });

  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;
  const visitor = existing && UUID.test(existing) ? existing : crypto.randomUUID();

  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('room_start_session', {
    p_workspace: workspace,
    p_track: track,
    p_visitor: visitor,
    p_share_token: str(body.share, 80),
    p_referrer: str(body.referrer, 500),
    p_utm_source: str(body.utmSource, 100),
    p_utm_medium: str(body.utmMedium, 100),
    p_utm_campaign: str(body.utmCampaign, 100),
    p_country: str(request.headers.get('x-vercel-ip-country'), 2),
  });

  if (data) {
    // After replying to the visitor, tell the team if a named recipient just opened their link,
    // and log the visit on their HubSpot timeline if that is switched on.
    const origin = await appOrigin();
    after(async () => {
      await alertFor(data as string, 'link_opened', origin);
      await syncHubspotActivity(data as string, origin);
    });
  }
  const response = NextResponse.json({ session: (data as string | null) ?? null });
  const share = str(body.share, 80);
  if (data && share) {
    // Remember the personal link for this room only, so a reload stays personalised
    // after the token has been removed from the address bar.
    response.cookies.set('fello_r', share, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: `/r/${workspace}/${track}`,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  if (data && visitor !== existing) {
    response.cookies.set(VISITOR_COOKIE, visitor, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/r',
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}
