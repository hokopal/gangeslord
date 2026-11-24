-- Custom hostnames are claimed by one workspace and routed only after verification.
-- This table is server-owned: browser roles have no direct access to bindings.
create table if not exists public.workspace_domains (
  domain text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_domains_workspace_idx
  on public.workspace_domains (workspace_id, status, created_at);

alter table public.workspace_domains enable row level security;
revoke all on table public.workspace_domains from anon, authenticated;
