import { redirect } from 'next/navigation';

/** AI setup moved under Integrations. Old links keep working. */
export default async function LegacyAiSettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  redirect(`/w/${workspace}/integrations/ai`);
}
