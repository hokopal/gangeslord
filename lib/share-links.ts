import { createServerSupabase } from './supabase/server';

export type ShareLink = {
  id: string;
  token: string;
  recipientName: string;
  recipientEmail: string | null;
  accountName: string | null;
  createdAt: string;
};

type Row = { id: string; token: string; recipient_name: string; recipient_email: string | null; account_name: string | null; created_at: string };
const COLUMNS = 'id, token, recipient_name, recipient_email, account_name, created_at';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toLink = (r: Row): ShareLink => ({
  id: r.id, token: r.token, recipientName: r.recipient_name, recipientEmail: r.recipient_email, accountName: r.account_name, createdAt: r.created_at,
});

export async function listShareLinks(trackId: string): Promise<ShareLink[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('share_links').select(COLUMNS).eq('track_id', trackId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toLink);
}

export type ShareLinkInput = { name: string; email: string; account: string };

/** Cleans the recipient details for a personal link. Throws recipient_required or email_invalid. */
export function normalizeRecipient(input: ShareLinkInput): { recipient_name: string; recipient_email: string | null; account_name: string | null } {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase();
  const account = input.account.trim().slice(0, 120);
  if (name === '') throw new Error('recipient_required');
  if (email !== '' && !EMAIL.test(email)) throw new Error('email_invalid');
  return { recipient_name: name, recipient_email: email || null, account_name: account || null };
}

export async function createShareLink(workspaceId: string, trackId: string, input: ShareLinkInput): Promise<void> {
  const values = normalizeRecipient(input);
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('share_links').insert({ workspace_id: workspaceId, track_id: trackId, ...values });
  if (error) throw new Error(error.message);
}

export async function deleteShareLink(workspaceId: string, trackId: string, id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('share_links').delete().eq('workspace_id', workspaceId).eq('track_id', trackId).eq('id', id);
  if (error) throw new Error(error.message);
}
