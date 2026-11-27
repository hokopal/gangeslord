import { ChevronRight, CreditCard, Globe, Palette, Plug, Users } from 'lucide-react';
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

      <h2 className="section-title">Manage</h2>
      <nav className="settings-nav" aria-label="Settings sections">
        <Link className="settings-row" href={`/w/${workspace.slug}/settings/plan`}>
          <span className="settings-icon">
            <CreditCard aria-hidden="true" />
          </span>
          <span className="settings-text">
            <span className="settings-title">Plan</span>
            <span className="settings-hint">What’s included in your plan and how much of it you use.</span>
          </span>
          <ChevronRight className="settings-chevron" aria-hidden="true" />
        </Link>

        {editable ? (
          <Link className="settings-row" href={`/w/${workspace.slug}/settings/branding`}>
            <span className="settings-icon">
              <Palette aria-hidden="true" />
            </span>
            <span className="settings-text">
              <span className="settings-title">Branding</span>
              <span className="settings-hint">Logo, colour and what buyers see in the room footer.</span>
            </span>
            <ChevronRight className="settings-chevron" aria-hidden="true" />
          </Link>
        ) : null}

        {editable ? (
          <Link className="settings-row" href={`/w/${workspace.slug}/settings/domains`}>
            <span className="settings-icon">
              <Globe aria-hidden="true" />
            </span>
            <span className="settings-text">
              <span className="settings-title">Custom domains</span>
              <span className="settings-hint">Serve room links from your own domain.</span>
            </span>
            <ChevronRight className="settings-chevron" aria-hidden="true" />
          </Link>
        ) : null}

        {can(role, 'members.manage') ? (
          <Link className="settings-row" href={`/w/${workspace.slug}/settings/members`}>
            <span className="settings-icon">
              <Users aria-hidden="true" />
            </span>
            <span className="settings-text">
              <span className="settings-title">People</span>
              <span className="settings-hint">Invite teammates and control what they can see and do.</span>
            </span>
            <ChevronRight className="settings-chevron" aria-hidden="true" />
          </Link>
        ) : null}

        {editable ? (
          <Link className="settings-row" href={`/w/${workspace.slug}/integrations`}>
            <span className="settings-icon">
              <Plug aria-hidden="true" />
            </span>
            <span className="settings-text">
              <span className="settings-title">Integrations</span>
              <span className="settings-hint">AI, Slack and other connections for this workspace.</span>
            </span>
            <ChevronRight className="settings-chevron" aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
