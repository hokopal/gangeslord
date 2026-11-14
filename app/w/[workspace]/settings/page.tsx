import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';
import { updateWorkspaceAction } from './actions';

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context || !can(context.role, 'settings.read')) notFound();
  const { workspace, role } = context;
  const editable = can(role, 'settings.write');

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">
        {editable ? 'Manage how this workspace is named and addressed.' : 'Only admins can change these.'}
      </p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved.
        </p>
      ) : null}

      <h2 className="section-title">General</h2>
      <form action={updateWorkspaceAction} style={{ maxWidth: 420 }}>
        <input type="hidden" name="workspace" value={workspace.slug} />
        <div className="field">
          <label className="label" htmlFor="name">
            Workspace name
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={workspace.name}
            required
            maxLength={80}
            disabled={!editable}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="slug">
            Workspace address
          </label>
          <input
            id="slug"
            name="slug"
            className="input"
            defaultValue={workspace.slug}
            required
            minLength={3}
            maxLength={40}
            pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
            disabled={!editable}
          />
          <span className="hint">
            Lowercase letters, numbers and hyphens. Changing it breaks links that use the old address.
          </span>
        </div>
        {editable ? (
          <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
            Save changes
          </SubmitButton>
        ) : null}
      </form>

      <h2 className="section-title">Plan</h2>
      <Link className="btn" href={`/w/${workspace.slug}/settings/plan`}>
        Alpha free trial: see what’s included
      </Link>

      {editable ? (
        <>
          <h2 className="section-title">Branding</h2>
          <Link className="btn" href={`/w/${workspace.slug}/settings/branding`}>
            Logo, colour and room footer
          </Link>
        </>
      ) : null}

      {can(role, 'members.manage') ? (
        <>
          <h2 className="section-title">People</h2>
          <Link className="btn" href={`/w/${workspace.slug}/settings/members`}>
            Manage members
          </Link>
        </>
      ) : null}

      {editable ? (
        <>
          <h2 className="section-title">Integrations</h2>
          <Link className="btn" href={`/w/${workspace.slug}/integrations`}>
            Manage AI, Slack and other connections
          </Link>
        </>
      ) : null}
    </div>
  );
}
