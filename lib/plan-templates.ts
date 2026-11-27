import { isActionOwner, validateLabel, type ActionOwner, type PlanItem } from './action-plan-core';
import { validateTemplateName } from './plan-templates-core';
import { moveId, positionAt } from './ordering';
import { createServerSupabase } from './supabase/server';

// Workspace-level mutual-action-plan templates: named, ordered sets of steps a seller
// applies to a track. Applying copies the steps; the copy is edited per deal, never linked.

export type PlanTemplate = { id: string; name: string; createdAt: string };
export type PlanTemplateWithItems = PlanTemplate & { items: PlanItem[] };

const toItem = (row: { id: string; position: number; label: string; owner: string }): PlanItem => ({
  id: row.id,
  position: row.position,
  label: row.label,
  owner: isActionOwner(row.owner) ? row.owner : 'buyer',
  dueDate: null,
  done: false,
  doneAt: null,
  doneBy: null,
});

export async function listTemplates(workspaceId: string): Promise<PlanTemplateWithItems[]> {
  const supabase = await createServerSupabase();
  const [templates, items] = await Promise.all([
    supabase.from('plan_templates').select('id, name, created_at').eq('workspace_id', workspaceId).order('created_at'),
    supabase.from('plan_template_items').select('id, template_id, position, label, owner').eq('workspace_id', workspaceId).order('position').order('created_at'),
  ]);
  if (templates.error) throw new Error(templates.error.message);
  if (items.error) throw new Error(items.error.message);
  const byTemplate = new Map<string, PlanItem[]>();
  for (const row of (items.data ?? []) as ({ template_id: string } & Parameters<typeof toItem>[0])[]) {
    const list = byTemplate.get(row.template_id) ?? [];
    list.push(toItem(row));
    byTemplate.set(row.template_id, list);
  }
  return ((templates.data ?? []) as { id: string; name: string; created_at: string }[]).map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    items: byTemplate.get(row.id) ?? [],
  }));
}

export async function createTemplate(workspaceId: string, name: unknown): Promise<string> {
  const parsed = validateTemplateName(name);
  if (!parsed) throw new Error('template_name_required');
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('plan_templates')
    .insert({ workspace_id: workspaceId, name: parsed })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'plan_failed');
  return (data as { id: string }).id;
}

export async function renameTemplate(workspaceId: string, id: string, name: unknown): Promise<void> {
  const parsed = validateTemplateName(name);
  if (!parsed) throw new Error('template_name_required');
  const supabase = await createServerSupabase();
  const { error } = await supabase.from('plan_templates').update({ name: parsed }).eq('workspace_id', workspaceId).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(workspaceId: string, id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from('plan_templates').delete().eq('workspace_id', workspaceId).eq('id', id).select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('template_not_found');
}

export type TemplateItemInput = { label: string; owner: string };

function parseItem(input: TemplateItemInput): { label: string; owner: ActionOwner } {
  const label = validateLabel(input.label);
  if (!label) throw new Error('plan_label_required');
  if (!isActionOwner(input.owner)) throw new Error('plan_owner_invalid');
  return { label, owner: input.owner };
}

export async function addTemplateItem(workspaceId: string, templateId: string, input: TemplateItemInput): Promise<void> {
  const { label, owner } = parseItem(input);
  const supabase = await createServerSupabase();
  const { data: existing } = await supabase.from('plan_template_items').select('position').eq('template_id', templateId);
  const max = ((existing ?? []) as { position: number }[]).reduce((highest, row) => Math.max(highest, row.position), 0);
  const { error } = await supabase
    .from('plan_template_items')
    .insert({ workspace_id: workspaceId, template_id: templateId, position: max + 1, label, owner });
  if (error) throw new Error(error.message);
}

export async function saveTemplateItem(workspaceId: string, templateId: string, id: string, input: TemplateItemInput): Promise<void> {
  const { label, owner } = parseItem(input);
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from('plan_template_items')
    .update({ label, owner })
    .eq('workspace_id', workspaceId)
    .eq('template_id', templateId)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moveTemplateItem(workspaceId: string, templateId: string, id: string, toIndex: number): Promise<void> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('plan_template_items')
    .select('id, position')
    .eq('workspace_id', workspaceId)
    .eq('template_id', templateId)
    .order('position')
    .order('created_at');
  const rows = (data ?? []) as { id: string; position: number }[];
  if (!rows.some((row) => row.id === id)) throw new Error('not_found');
  const others = rows.filter((row) => row.id !== id).map((row) => row.position);
  const clamped = Math.max(0, Math.min(toIndex, others.length));
  const position = positionAt(others, clamped);
  if (position !== null) {
    const { error } = await supabase.from('plan_template_items').update({ position }).eq('id', id).eq('template_id', templateId);
    if (error) throw new Error(error.message);
    return;
  }
  const order = moveId(rows.map((row) => row.id), id, clamped);
  for (const [index, itemId] of order.entries()) {
    const { error } = await supabase.from('plan_template_items').update({ position: index + 1 }).eq('id', itemId).eq('template_id', templateId);
    if (error) throw new Error(error.message);
  }
}

export async function deleteTemplateItem(workspaceId: string, templateId: string, id: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('plan_template_items')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('template_id', templateId)
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('not_found');
}

/**
 * Copies a template's steps onto a track's mutual plan (atomic, server-side).
 * Returns the number of steps added.
 */
export async function applyTemplateToTrack(templateId: string, trackId: string): Promise<number> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc('apply_plan_template', { p_template: templateId, p_track: trackId });
  if (error) {
    if (error.message.includes('template_not_found')) throw new Error('template_not_found');
    if (error.message.includes('not_allowed')) throw new Error('not_allowed');
    throw new Error(error.message);
  }
  return typeof data === 'number' ? data : Number(data) || 0;
}
