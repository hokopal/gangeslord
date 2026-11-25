import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { serverSecret } from './supabase/admin';
import { createServerSupabase } from './supabase/server';

// A buyer's visit to a room, as seen by the endpoints that act on the buyer's behalf
// (the lead form, comments). One place decides how a request maps to a visit.

const VISITOR_COOKIE = 'fello_vid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$/;
const YEAR = 60 * 60 * 24 * 365;
const FORM_COOKIE = 'fello_fp';
const FORM_PROOF_VERSION = 'v1';

function formProofKey(): Buffer {
  return createHash('sha256').update(`pipemouse-room-form-v1${String.fromCharCode(0)}${serverSecret()}`).digest();
}

function formProofSignature(expires: number, workspace: string, track: string): string {
  return createHmac('sha256', formProofKey()).update(`${FORM_PROOF_VERSION}.${expires}.${workspace}.${track}`).digest('base64url');
}

/** A signed proof that this visitor completed this room's form; it cannot be forged or reused elsewhere. */
export function rememberRoomForm(response: NextResponse, workspace: string, track: string): void {
  const expires = Math.floor(Date.now() / 1000) + YEAR;
  const value = `${FORM_PROOF_VERSION}.${expires}.${workspace}.${track}.${formProofSignature(expires, workspace, track)}`;
  response.cookies.set(FORM_COOKIE, value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: YEAR });
}

/** Verifies the server signature, expiry and exact room encoded in a form-proof cookie. */
export function hasRoomFormProof(value: string | undefined, workspace: string, track: string): boolean {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 5 || parts[0] !== FORM_PROOF_VERSION || parts[2] !== workspace || parts[3] !== track) return false;
  const expires = Number(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(expires) || expires < now || expires > now + YEAR + 300) return false;
  try {
    const expected = Buffer.from(formProofSignature(expires, workspace, track));
    const actual = Buffer.from(parts[4]);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

/** The caller's visitor cookie, or an empty string when they have none. */
export async function readVisitor(): Promise<string> {
  const value = (await cookies()).get(VISITOR_COOKIE)?.value;
  return isUuid(value) ? value : '';
}

export type RoomVisit = {
  supabase: Awaited<ReturnType<typeof createServerSupabase>>;
  workspace: string;
  track: string;
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
  return { supabase, workspace, track, session: session as string, newVisitor: visitor === existing ? null : visitor };
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
