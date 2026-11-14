import { createAdminSupabase } from './supabase/admin';

const BUCKET = 'assets';

/**
 * Removes every stored file that belonged to a workspace: uploaded PDFs and page snapshots,
 * which all live under a folder named after the workspace id. Call it only after the
 * workspace itself has been deleted. Best-effort: a failure leaves orphaned files, never broken data.
 */
export async function removeWorkspaceFiles(workspaceId: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/.test(workspaceId)) return 0;
  const storage = createAdminSupabase().storage.from(BUCKET);
  let removed = 0;
  // Folders are walked breadth-first; each listing is capped, so keep asking until a folder is empty.
  const folders = [workspaceId];
  for (let guard = 0; folders.length > 0 && guard < 200; guard += 1) {
    const folder = folders[0];
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error || !data || data.length === 0) {
      folders.shift();
      continue;
    }
    // An entry without an id is a sub-folder.
    const files = data.filter((entry) => entry.id).map((entry) => `${folder}/${entry.name}`);
    const subfolders = data.filter((entry) => !entry.id).map((entry) => `${folder}/${entry.name}`);
    if (files.length > 0) {
      const { error: removeError } = await storage.remove(files);
      if (removeError) break;
      removed += files.length;
    }
    if (subfolders.length > 0) {
      folders.shift();
      folders.push(...subfolders);
    } else if (files.length < 1000) {
      folders.shift();
    }
  }
  return removed;
}
