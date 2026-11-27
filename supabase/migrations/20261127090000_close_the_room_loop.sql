-- The room closes the deal: a mutual action plan both sides can tick off, and an
-- accept & sign step the buyer completes in the room. Additive only.
--
-- Seller-side access goes through row-level security like the rest of track content.
-- Buyer-side access goes through security-definer functions that take a room session as
-- proof, like the rest of the guest endpoints. Visitors never read the tables directly.

-- ── Mutual action plan ──────────────────────────────────────────────────────────

create table if not exists public.track_action_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  -- Fractional position, like track_items, so a move rewrites one row.
  position double precision not null default 0,
  label text not null check (char_length(label) between 1 and 300),
  owner text not null default 'seller' check (owner in ('seller', 'buyer')),
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  -- Who ticked it, for the audit trail.
  done_by text check (done_by in ('seller', 'buyer')),
  done_visitor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists track_action_items_track_idx
  on public.track_action_items (track_id, position);

alter table public.track_action_items enable row level security;
revoke all on table public.track_action_items from anon, authenticated;
grant select, insert, update, delete on table public.track_action_items to authenticated;

create policy track_action_items_select on public.track_action_items
  for select to authenticated using (public.is_member(workspace_id));

-- Same rule as the rest of a track's content: admins, and editors who own or collaborate on it.
create policy track_action_items_write on public.track_action_items
  for all to authenticated using (public.edits_track(track_id)) with check (public.edits_track(track_id));

create trigger set_updated_at before update on public.track_action_items
  for each row execute function public.set_updated_at();

-- ── Accept & sign ───────────────────────────────────────────────────────────────
-- One row per visitor per room. Re-signing replaces the previous row, so a buyer who
-- corrects a typo does not fork the record. Rows are immutable in every other way.

create table if not exists public.track_acceptances (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  signer_name text not null check (char_length(signer_name) between 1 and 120),
  signer_email text not null check (char_length(signer_email) between 3 and 254),
  typed_signature text not null check (char_length(typed_signature) between 1 and 120),
  -- The exact wording the signer agreed to, stored verbatim for the audit trail.
  statement text not null check (char_length(statement) between 1 and 500),
  ip text,
  user_agent text,
  accepted_at timestamptz not null default now(),
  unique (track_id, visitor_id)
);

create index if not exists track_acceptances_track_idx
  on public.track_acceptances (track_id, accepted_at desc);

alter table public.track_acceptances enable row level security;
revoke all on table public.track_acceptances from anon, authenticated;
grant select on table public.track_acceptances to authenticated;

-- Same audience as guest notes: the track's creator and the people it is shared with.
create policy track_acceptances_select on public.track_acceptances
  for select to authenticated using (public.sees_guest_content(track_id));

-- ── Buyer-facing answers, given only to a valid room session ────────────────────
-- Sessions exist only for published rooms, so answers never leak drafts or suspended workspaces.

-- The mutual plan for the buyer's room, plus who the visitor already is (to prefill the sign form).
create or replace function public.room_action_items(p_session uuid)
  returns jsonb
  language sql stable security definer
  set search_path = public
as $function$
  select jsonb_build_object(
    'identified', v.email is not null or v.name is not null,
    'name', v.name,
    'email', v.email,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'label', i.label, 'owner', i.owner, 'due_date', i.due_date, 'done', i.done
      ) order by i.position, i.created_at)
      from track_action_items i
      where i.track_id = s.track_id
    ), '[]'::jsonb))
  from sessions s join visitors v on v.id = s.visitor_id
  where s.id = p_session;
$function$;

-- Tick or untick one item. Anyone in the room may do it: it is a mutual plan. Visitors
-- can only affect the room their session belongs to, and the change records who made it.
create or replace function public.room_toggle_action(p_session uuid, p_id uuid, p_done boolean)
  returns boolean
  language plpgsql security definer
  set search_path = public
as $function$
declare
  s sessions;
  v_done boolean;
begin
  select * into s from sessions where id = p_session;
  if s.id is null then return false; end if;
  v_done := coalesce(p_done, true);
  update track_action_items
    set done = v_done,
        done_at = case when v_done then now() end,
        done_by = case when v_done then 'buyer' end,
        done_visitor_id = case when v_done then s.visitor_id end,
        updated_at = now()
    where id = p_id and track_id = s.track_id;
  return found;
end;
$function$;

-- Accept and sign the room's proposal. Validation mirrors the guest-note rules; the row is
-- upserted so a re-sign replaces an earlier one. The visitor is also remembered, like the lead form.
create or replace function public.room_accept(p_session uuid, p_name text, p_email text, p_signature text, p_statement text, p_ip text, p_user_agent text)
  returns jsonb
  language plpgsql security definer
  set search_path = public
as $function$
declare
  s sessions;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_sig text := btrim(coalesce(p_signature, ''));
  v_stmt text := btrim(coalesce(p_statement, ''));
  v_at timestamptz;
begin
  select * into s from sessions where id = p_session;
  if s.id is null then return null; end if;
  if char_length(v_name) not between 1 and 120 then return null; end if;
  if char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then return null; end if;
  if char_length(v_sig) not between 1 and 120 then return null; end if;
  if char_length(v_stmt) not between 1 and 500 then return null; end if;
  insert into track_acceptances (workspace_id, track_id, visitor_id, session_id, signer_name, signer_email, typed_signature, statement, ip, user_agent)
  values (s.workspace_id, s.track_id, s.visitor_id, s.id, v_name, v_email, v_sig, v_stmt, left(p_ip, 64), left(p_user_agent, 400))
  on conflict (track_id, visitor_id) do update set
    session_id = excluded.session_id,
    signer_name = excluded.signer_name,
    signer_email = excluded.signer_email,
    typed_signature = excluded.typed_signature,
    statement = excluded.statement,
    ip = excluded.ip,
    user_agent = excluded.user_agent,
    accepted_at = now()
  returning accepted_at into v_at;
  update visitors set name = coalesce(name, v_name), email = coalesce(email, v_email) where id = s.visitor_id;
  insert into events (workspace_id, track_id, session_id, type) values (s.workspace_id, s.track_id, s.id, 'acceptance');
  return jsonb_build_object('accepted', true, 'accepted_at', v_at);
end;
$function$;

-- Let rooms report a signature as an event alongside the engagement events.
alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check
  check (type = any (array['session_start', 'item_view', 'threshold_met', 'cta_click', 'acceptance']::text[]));
