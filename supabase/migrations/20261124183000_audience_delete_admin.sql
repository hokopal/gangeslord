-- Audience deletion is an admin permission, matching tracks and the server action.
drop policy if exists audiences_delete on public.audiences;
create policy audiences_delete on public.audiences
  for delete to authenticated
  using (has_role(workspace_id, '{admin}'::text[]));
