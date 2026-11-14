import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { createServerSupabase } from './supabase/server';

// A buyer's visit to a room, as seen by the endpoints that act on the buyer's behalf
// (the lead form, comments). One place decides how a request maps to a visit.

const VISITOR_COOKIE = 'fello_vid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/;
const YEAR = 60 * 60 * 24 * 365;

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** The caller's visitor cookie, or an empty string when they have none. */
export async function readVisitor(): Promise<string> {
  const value = (await cookies()).get(VISITOR_COOKIE)?.value;
  return isUuid(value) ? value : '';
}

export type RoomVisit = {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  /** The visit's session id. Database functions for guests take it as proof of who is asking. */
  session: string;
  /** Set when this request had no visitor cookie yet, so the response must set one. */
  newVisitor: string | null;
};

/**
 * Finds, or starts, the caller's visit to a published room from their visitor cookie.
 * Null when the room does not exist, is not published, or its workspace is suspended.
 */
export async function resolveVisit(workspace: unknown, track: unknown, country: string | null = null): Promise<RoomVisit | null> {
  if (typeof workspace !== 'string' || typeof track !== 'string' || !SLUG.test(workspace) || !SLUG.test(track)) return null;
  const existing = (await cookies()).get(VISITOR_COOKIE)?.value;
  const visitor = isUuid(existing) ? existing : crypto.randomUUID();
  const supabase = await createServerSupabase();
  const { data: session } = await supabase.rpc('room_start_session', {
    p_workspace: workspace, p_track: track, p_visitor: visitor, p_share_token: null,
    p_referrer: null, p_utm_source: null, p_utm_medium: null, p_utm_campaign: null, p_country: country,
  });
  if (!session) return null;
  return { supabase, session: session as string, newVisitor: visitor === existing ? null : visitor };
}

/** Sets the visitor cookie on a response when this request created the visitor. */
export function rememberVisitor(response: NextResponse, visit: RoomVisit): void {
  if (!visit.newVisitor) return;
  response.cookies.set(VISITOR_COOKIE, visit.newVisitor, { httpOnly: true, secure: true, sameSite: 'lax', path: '/r', maxAge: YEAR });
}

/** Reads a JSON object body, or null when the body is not one. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
