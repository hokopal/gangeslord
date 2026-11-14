import { createAdminSupabase } from './supabase/admin';

export const TOPICS = { general: 'A general question', privacy: 'Privacy or my data', support: 'Help with my account', sales: 'Plans and pricing' } as const;
export type Topic = keyof typeof TOPICS;

export type ContactInput = { name: string; email: string; topic: string; message: string };

/** Checks and tidies a contact message. Throws contact_name_required, email_invalid or contact_message_required. */
export function normalizeContact(input: ContactInput) {
  const name = input.name.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (name === '') throw new Error('contact_name_required');
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email_invalid');
  const message = input.message.trim().slice(0, 4000);
  if (message.length < 10) throw new Error('contact_message_required');
  const topic: Topic = input.topic in TOPICS ? (input.topic as Topic) : 'general';
  return { name, email, topic, message };
}

/** Stores a message from the public contact page. At most three an hour from one address, to blunt abuse. */
export async function saveContactMessage(input: ContactInput): Promise<void> {
  const values = normalizeContact(input);
  const admin = createAdminSupabase();
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin.from('contact_messages').select('id', { count: 'exact', head: true }).eq('email', values.email).gte('created_at', since);
  if ((count ?? 0) >= 3) throw new Error('contact_too_many');
  const { error } = await admin.from('contact_messages').insert(values);
  if (error) throw new Error('contact_failed');
}

export type ContactMessage = { id: number; name: string; email: string; topic: Topic; message: string; createdAt: string };

/** The newest contact messages. Call only for a platform admin. */
export async function listContactMessages(limit = 200): Promise<ContactMessage[]> {
  const { data } = await createAdminSupabase().from('contact_messages').select('id, name, email, topic, message, created_at').order('id', { ascending: false }).limit(limit);
  return ((data ?? []) as { id: number; name: string; email: string; topic: Topic; message: string; created_at: string }[]).map((r) => ({
    id: r.id, name: r.name, email: r.email, topic: r.topic, message: r.message, createdAt: r.created_at,
  }));
}
