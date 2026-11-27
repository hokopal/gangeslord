-- Reusable mutual-action-plan templates: a workspace keeps named plans, applies them
-- to a track, and edits the copy per deal. The copy lands in track_action_items like
-- any other step. Additive only.

create table if not exists public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_template_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  template_id uuid not null references public.plan_templates(id) on delete cascade,
  -- Fractional position, like track_action_items, so a move rewrites one row.
  position double precision not null default 0,
  label text not null check (char_length(label) between 1 and 300),
  owner text not null default 'buyer' check (owner in ('seller', 'buyer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_template_items_template_idx
  on public.plan_template_items (template_id, position);

alter table public.plan_templates enable row level security;
alter table public.plan_template_items enable row level security;
revoke all on table public.plan_templates from anon, authenticated;
revoke all on table public.plan_template_items from anon, authenticated;
grant select, insert, update, delete on table public.plan_templates to authenticated;
grant select, insert, update, delete on table public.plan_template_items to authenticated;

-- Members may read templates; editors and admins may create and change them.
create policy plan_templates_select on public.plan_templates
  for select to authenticated using (public.is_member(workspace_id));
create policy plan_templates_write on public.plan_templates
  for all to authenticated using (public.has_role(workspace_id, '{admin,editor}'::text[]))
  with check (public.has_role(workspace_id, '{admin,editor}'::text[]));

create policy plan_template_items_select on public.plan_template_items
  for select to authenticated using (public.is_member(workspace_id));
create policy plan_template_items_write on public.plan_template_items
  for all to authenticated using (public.has_role(workspace_id, '{admin,editor}'::text[]))
  with check (public.has_role(workspace_id, '{admin,editor}'::text[]));

create trigger set_updated_at before update on public.plan_templates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.plan_template_items
  for each row execute function public.set_updated_at();

-- Applying a template copies its steps into a track's plan. Atomic: either the whole
-- plan lands or none does. Callers must be able to edit the track; the check runs as
-- the caller's own permissions.
create or replace function public.apply_plan_template(p_template uuid, p_track uuid)
  returns integer
  language plpgsql
  set search_path = public
as $function$
declare
  t plan_templates;
  base double precision;
  n integer := 0;
begin
  select * into t from plan_templates where id = p_template;
  if t.id is null then
    raise exception 'template_not_found';
  end if;
  if not public.is_member(t.workspace_id) then
    raise exception 'not_allowed';
  end if;
  if not public.edits_track(p_track) then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from tracks where id = p_track and workspace_id = t.workspace_id) then
    raise exception 'template_track_mismatch';
  end if;
  select coalesce(max(position), 0) into base
    from track_action_items where track_id = p_track and workspace_id = t.workspace_id;
  insert into track_action_items (workspace_id, track_id, position, label, owner)
  select t.workspace_id, p_track, base + row_number() over (order by i.position, i.created_at), i.label, i.owner
    from plan_template_items i
   where i.template_id = t.id and i.workspace_id = t.workspace_id;
  get diagnostics n = row_count;
  return n;
end;
$function$;

revoke all on function public.apply_plan_template(uuid, uuid) from public, anon;
grant execute on function public.apply_plan_template(uuid, uuid) to authenticated;
