import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBranding } from '@/lib/branding';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { BrandingForm } from './BrandingForm';

export default async function BrandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const branding = await getBranding(workspace.id);

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/settings`} className="back">
        <ArrowLeft aria-hidden="true" /> Settings
      </Link>
      <h1 className="page-title">Branding</h1>
      <p className="page-subtitle">How your rooms look to buyers. These apply to every room in this workspace.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Branding saved. Open rooms pick it up on their next load.
        </p>
      ) : null}
      <BrandingForm workspaceSlug={workspace.slug} workspaceName={workspace.name} initial={branding} />
    </div>
  );
}
