import { nextAvailableSlug, TITLE_SLUG_MAX } from '../slug';
import { createServerSupabase } from '../supabase/server';
import { createTrack } from '../tracks';
import { buildPrompt, MAX_CANDIDATES, parseDraft, SYSTEM_PROMPT, type Candidate } from './draft';
import { complete } from './providers';
import { loadAiCredentials } from './settings';

const MIN_BRIEF = 10;
const MAX_BRIEF = 2000;

type AssetRow = { id: string; slug: string; title: string; type: string; description: string; extracted_text: string };

/**
 * Drafts a track from a brief using only the workspace's own ready library items.
 * The result is saved as a draft, which only workspace members can see, for the seller to review.
 */
export async function generateDraftTrack(workspaceId: string, rawBrief: string): Promise<{ trackId: string; ctaLabel: string }> {
  const brief = rawBrief.trim();
  if (brief.length < MIN_BRIEF || brief.length > MAX_BRIEF) throw new Error('brief_required');
  const { provider, apiKey, model } = await loadAiCredentials(workspaceId);

  // Read through the user's own session, so the library is exactly what they are allowed to see.
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('assets')
    .select('id, slug, title, type, description, extracted_text')
    .eq('workspace_id', workspaceId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(MAX_CANDIDATES);
  if (error) throw new Error('ai_failed');
  const assets = (data ?? []) as AssetRow[];
  if (assets.length === 0) throw new Error('library_empty');

  const candidates: Candidate[] = assets.map((a) => ({
    id: a.id, title: a.title, type: a.type, description: a.description, excerpt: a.extracted_text,
  }));
  const reply = await complete(provider, apiKey, model, SYSTEM_PROMPT, buildPrompt(brief, candidates));
  const draft = parseDraft(reply, new Set(assets.map((a) => a.id)));

  const track = await createTrack(workspaceId, draft.name);
  await supabase.from('tracks').update({ ai_brief: brief }).eq('id', track.id);

  const bySlug = new Map(assets.map((a) => [a.id, a.slug]));
  const taken = new Set<string>();
  const rows = draft.items.map((item, index) => {
    const slug = nextAvailableSlug(bySlug.get(item.assetId) as string, taken, TITLE_SLUG_MAX);
    taken.add(slug);
    return {
      workspace_id: workspaceId,
      track_id: track.id,
      asset_id: item.assetId,
      position: index + 1,
      slug,
      title_override: item.title,
      ai_reason: item.reason,
    };
  });
  const inserted = await supabase.from('track_items').insert(rows);
  if (inserted.error) {
    await supabase.from('tracks').delete().eq('id', track.id);
    throw new Error('ai_failed');
  }
  return { trackId: track.id, ctaLabel: draft.ctaLabel };
}

export type DraftReview = {
  name: string;
  brief: string;
  items: { id: string; title: string; type: string; reason: string }[];
};

export async function getDraftReview(workspaceId: string, trackId: string): Promise<DraftReview | null> {
  const supabase = await createServerSupabase();
  const { data: track } = await supabase
    .from('tracks')
    .select('name, ai_brief')
    .eq('workspace_id', workspaceId)
    .eq('id', trackId)
    .maybeSingle();
  if (!track) return null;
  const { data: items } = await supabase
    .from('track_items')
    .select('id, asset_id, title_override, ai_reason')
    .eq('track_id', trackId)
    .order('position');
  const rows = (items ?? []) as { id: string; asset_id: string; title_override: string; ai_reason: string }[];
  const { data: assets } = rows.length
    ? await supabase.from('assets').select('id, title, type').in('id', rows.map((r) => r.asset_id))
    : { data: [] };
  const byId = new Map(((assets ?? []) as { id: string; title: string; type: string }[]).map((a) => [a.id, a]));
  return {
    name: track.name as string,
    brief: (track.ai_brief as string | null) ?? '',
    items: rows.map((r) => ({
      id: r.id,
      title: r.title_override || byId.get(r.asset_id)?.title || 'Untitled',
      type: byId.get(r.asset_id)?.type ?? 'web',
      reason: r.ai_reason,
    })),
  };
}
