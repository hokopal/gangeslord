import { readSnapshot } from '@/lib/assets';
import { snapshotResponse } from '@/lib/snapshot-response';

export async function GET(_request: Request, { params }: { params: Promise<{ asset: string }> }) {
  const { asset } = await params;
  // Row-level security decides visibility: a non-member gets the same 404 as a missing asset.
  return snapshotResponse(/^[0-9a-f-]{36}$/.test(asset) ? await readSnapshot(asset) : null);
}
