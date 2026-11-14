import { cache } from 'react';
import type { Role } from './roles';
import { isValidSlug, slugify } from './slug';
import { createServerSupabase, getUser } from './supabase/server';

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
};

export type WorkspaceContext = { workspace: Workspace; role: Role };

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
};

const COLUMNS = 'id, name, slug, logo_url, brand_color';
const UNIQUE_VIOLATION = '23505';
const MAX_SLUG_ATTEMPTS = 20;
const MAX_SLUG_LENGTH = 40;

function toWorkspace(row: WorkspaceRow): Workspace {
  return { id: row.id, name: row.name, slug: row.slug, logoUrl: row.logo_url, brandColor: row.brand_color };
}

function numbered(base: string, n: number): string {
  if (n === 1) return base;
  const suffix = `-${n}`;
  return base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/, '') + suffix;
}

/** Creates a workspace owned by the current user, retrying with -2, -3… if the slug is taken. */
export async function createWorkspace(name: string): Promise<Workspace> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('name_required');
  const supabase = await createServerSupabase();
  const base = slugify(trimmed);
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.rpc('create_workspace', {
      p_name: trimmed,
      p_slug: numbered(base, attempt),
    });
    if (!error) return toWorkspace(data as WorkspaceRow);
    if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);
  }
  throw new Error('slug_taken');
}

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('workspaces').select(COLUMNS).order('name');
  if (error) throw new Error(error.message);
  return (data as WorkspaceRow[]).map(toWorkspace);
}

/**
 * The workspace and the current user's role in it. Returns null both when the slug
 * does not exist and when the user is not a member, so callers cannot tell them apart.
 */
export const getWorkspaceContext = cache(async (slug: string): Promise<WorkspaceContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createServerSupabase();
  const { data: ws } = await supabase.from('workspaces').select(COLUMNS).eq('slug', slug).maybeSingle();
  if (!ws) return null;
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', (ws as WorkspaceRow).id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) return null;
  return { workspace: toWorkspace(ws as WorkspaceRow), role: membership.role as Role };
});

export async function renameWorkspace(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('name_required');
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('workspaces').update({ name: trimmed }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function changeWorkspaceSlug(id: string, slug: string): Promise<void> {
  if (!isValidSlug(slug)) throw new Error('slug_invalid');
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('workspaces').update({ slug }).eq('id', id);
  if (error) throw new Error(error.code === UNIQUE_VIOLATION ? 'slug_taken' : error.message);
}
