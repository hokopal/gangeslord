import { MCP_PLANS } from './plans';
import { createAdminSupabase } from './supabase/admin';

/** The plan a workspace is on. Uses the service role: callers have already identified the workspace. */
export async function workspacePlan(workspaceId: string): Promise<string> {
  const { data } = await createAdminSupabase().from('workspaces').select('plan').eq('id', workspaceId).maybeSingle();
  return (data?.plan as string | undefined) ?? 'alpha_trial';
}

export async function planIncludesMcp(workspaceId: string): Promise<boolean> {
  return MCP_PLANS.includes(await workspacePlan(workspaceId));
}
