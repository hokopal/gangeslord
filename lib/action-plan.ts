import { isActionOwner, normalizeDueDate, validateLabel, type ActionOwner, type PlanItem } from './action-plan-core';
import { moveId, positionAt } from './ordering';
import { createServerSupabase } from './supabase/server';

// Seller-side access to the mutual action plan. Row-level security limits every query
// to members who may see the track, and every write to members who may edit it.

type ActionItemRow = {
  id: string; position: number; label: string; owner: string; due_date: string | null;
  done: boolean; done_at: string | null; done_by: string | null;
};

const COLUMNS = 'id, position, label, owner, due_date, done, done_at, done_by';

const toItem = (row: ActionItemRow): PlanItem => ({
  id: row.id,
  position: row.position,
  label: row.label,
  owner: isActionOwner(row.owner) ? row.owner : 'seller',
  dueDate: row.due_date,
  done: row.done,
  doneAt: row.done_at,
  doneBy: isActionOwner(row.done_by) ? row.done_by : null,
});

export async function listActionItems(trackId: string): Promise<PlanItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('track_action_items')
    .select(COLUMNS)
    .eq('track_id', trackId)
    .order('position')
    .order('created_at');
  if (error) throw new Error(error.message);
  return ((data ?? []) as ActionItemRow[]).map(toItem);
}

export type ActionItemInput = { label: string; owner: string; dueDate?: string | null };

function parseInput(input: ActionItemInput): { label: string; owner: ActionOwner; dueDate: string | null } {
  const label = validateLabel(input.label);
  if (!label) throw new Error('plan_label_required');
  if (!isActionOwner(input.owner)) throw new Error('plan_owner_invalid');
  const due = normalizeDueDate(input.dueDate ?? null);
  if (!due.ok) throw new Error('plan_due_invalid');
  return { label, owner: input.owner, dueDate: due.value };
}

export async function addActionItem(workspaceId: string, trackId: string, input: ActionItemInput): Promise<void> {
  const { label, owner, dueDate } = parseInput(input);
  const supabase = await createServerSupabase();
  const { data: existing } = await supabase.from('track_action_items').select('position').eq('track_id', trackId);
  const max = ((existing ?? []) as { position: number }[]).reduce((highest, row) => Math.max(highest, row.position), 0);
  const { error } = await supabase
    .from('track_action_items')
    .insert({ workspace_id: workspaceId, track_id: trackId, position: max + 1, label, owner, due_date: dueDate });
  if (error) throw new Error(error.message);
}

export async function saveActionItem(workspaceId: string, trackId: string, id: string, input: ActionItemInput): Promise<void> {
  const { label, owner, dueDate } = parseInput(input);
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('track_action_items')
    .update({ label, owner, due_date: dueDate })
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** The seller's own tick-box. Buyers tick from the room; this records that a member did it. */
export async function setActionDoneAsSeller(workspaceId: string, trackId: string, id: string, done: boolean): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('track_action_items')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? 'seller' : null, done_visitor_id: null })
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Moves an item to `toIndex` (its index in the list once it has been lifted out). */
export async function moveActionItem(workspaceId: string, trackId: string, id: string, toIndex: number): Promise<void> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('track_action_items')
    .select('id, position')
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .order('position')
    .order('created_at');
  const rows = (data ?? []) as { id: string; position: number }[];
  if (!rows.some((row) => row.id === id)) throw new Error('not_found');
  const others = rows.filter((row) => row.id !== id).map((row) => row.position);
  const clamped = Math.max(0, Math.min(toIndex, others.length));
  const position = positionAt(others, clamped);
  if (position !== null) {
    const { error } = await supabase.from('track_action_items').update({ position }).eq('id', id).eq('track_id', trackId);
    if (error) throw new Error(error.message);
    return;
  }
  // Neighbours have run out of room between them: give every item a whole-number position.
  const order = moveId(rows.map((row) => row.id), id, clamped);
  for (const [index, itemId] of order.entries()) {
    const { error } = await supabase.from('track_action_items').update({ position: index + 1 }).eq('id', itemId).eq('track_id', trackId);
    if (error) throw new Error(error.message);
  }
}

export async function deleteActionItem(workspaceId: string, trackId: string, id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('track_action_items')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('track_id', trackId)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('not_found');
}

export type Acceptance = {
  id: string;
  signerName: string;
  signerEmail: string;
  typedSignature: string;
  statement: string;
  acceptedAt: string;
};

/** Who has signed the room. Only the track's creator and the people it is shared with get rows. */
export async function listAcceptances(trackId: string): Promise<Acceptance[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('track_acceptances')
    .select('id, signer_name, signer_email, typed_signature, statement, accepted_at')
    .eq('track_id', trackId)
    .order('accepted_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as {
    id: string; signer_name: string; signer_email: string; typed_signature: string; statement: string; accepted_at: string;
  }[]).map((row) => ({
    id: row.id,
    signerName: row.signer_name,
    signerEmail: row.signer_email,
    typedSignature: row.typed_signature,
    statement: row.statement,
    acceptedAt: row.accepted_at,
  }));
}
