import { ArrowLeft } from 'lucide-react';
import { BarChart3, Building2, KeyRound, MessageSquare, Sparkles, Users, Webhook } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROVIDERS } from '@/lib/ai/providers';
import { getAiStatus } from '@/lib/ai/settings';
import { getHubspotStatus } from '@/lib/audiences';
import { listCrmStatuses } from '@/lib/crm-connectors';
import { CRM_INFO } from '@/lib/crm-core';
import { getGa4Status } from '@/lib/ga4';
import { listIntegrations } from '@/lib/integrations';
import { EVENT_LABEL, INTEGRATION_INFO, type IntegrationKind } from '@/lib/integrations-core';
import { can } from '@/lib/roles';
import { getWorkspaceContext } from '@/lib/workspaces';

const ICON: Record<IntegrationKind, React.ReactNode> = {
  slack: <MessageSquare aria-hidden="true" />,
  webhook: <Webhook aria-hidden="true" />,
};

function Status({ connected }: { connected: boolean }) {
  return <span className={connected ? 'badge' : 'badge badge-warn'}>{connected ? 'Connected' : 'Not connected'}</span>;
}

export default async function IntegrationsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params;
  const context = await getWorkspaceContext(slug);
  // Connections hold secrets for the whole workspace, so only admins can see this section.
  if (!context || !can(context.role, 'settings.write')) notFound();
  const { workspace } = context;
  const [ai, integrations, hubspot, ga4, crms] = await Promise.all([
    getAiStatus(workspace.id), listIntegrations(workspace.id), getHubspotStatus(workspace.id), getGa4Status(workspace.id), listCrmStatuses(workspace.id),
  ]);
  const base = `/w/${workspace.slug}/integrations`;

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/settings`} className="back">
        <ArrowLeft aria-hidden="true" /> Settings
      </Link>
      <h1 className="page-title">Integrations</h1>
      <p className="page-subtitle">Connect Pipemouse to the other tools your team uses. Only workspace admins can see and change these.</p>

      <h2 className="section-title">AI</h2>
      <div className="tiles">
        <Link href={`${base}/ai`} className="tile">
          <span className="tile-head">
            <span className="tile-icon">
              <Sparkles aria-hidden="true" />
            </span>
            <span className="tile-name">AI provider</span>
            <Status connected={ai.configured} />
          </span>
          <span className="tile-body">
            {ai.configured
              ? `${PROVIDERS[ai.provider].label}, using ${ai.model}. Drafts tracks from a brief.`
              : 'Add your own API key from Anthropic, OpenAI, Google Gemini, OpenRouter, Together AI or Groq to draft tracks with AI.'}
          </span>
        </Link>
      </div>

      <h2 className="section-title">CRM and sales tools</h2>
      <div className="tiles">
        <Link href={`${base}/hubspot`} className="tile">
          <span className="tile-head">
            <span className="tile-icon">
              <Users aria-hidden="true" />
            </span>
            <span className="tile-name">HubSpot</span>
            <Status connected={hubspot.connected} />
          </span>
          <span className="tile-body">
            {hubspot.connected
              ? `Connected${hubspot.portalId ? ` to account ${hubspot.portalId}` : ''}. Import segments as audiences and send each contact their own room link.`
              : 'Import contact segments, create a unique room link for each contact, and personalise rooms with contact details.'}
          </span>
        </Link>
        {crms.map((crm) => (
          <Link key={crm.kind} href={`${base}/crm/${crm.kind}`} className="tile">
            <span className="tile-head">
              <span className="tile-icon">
                <Building2 aria-hidden="true" />
              </span>
              <span className="tile-name">{CRM_INFO[crm.kind].name}</span>
              <Status connected={crm.connected} />
            </span>
            <span className="tile-body">{crm.connected ? `Connected (${crm.hint}). ${CRM_INFO[crm.kind].summary}` : CRM_INFO[crm.kind].summary}</span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Analytics</h2>
      <div className="tiles">
        <Link href={`${base}/ga4`} className="tile">
          <span className="tile-head">
            <span className="tile-icon">
              <BarChart3 aria-hidden="true" />
            </span>
            <span className="tile-name">Google Analytics</span>
            <Status connected={ga4.connected} />
          </span>
          <span className="tile-body">
            {ga4.connected
              ? `Connected to ${ga4.measurementId}. Room visits, button clicks and comments are sent as events.`
              : 'Send room visits, button clicks and comments to a Google Analytics 4 property as events.'}
          </span>
        </Link>
      </div>

      <h2 className="section-title">Alerts</h2>
      <div className="tiles">
        {integrations.map((item) => (
          <Link key={item.kind} href={`${base}/${item.kind}`} className="tile">
            <span className="tile-head">
              <span className="tile-icon">{ICON[item.kind]}</span>
              <span className="tile-name">{INTEGRATION_INFO[item.kind].name}</span>
              <Status connected={item.configured} />
            </span>
            <span className="tile-body">
              {item.configured
                ? item.events.length > 0
                  ? `Sends: ${item.events.map((e) => EVENT_LABEL[e].title.toLowerCase()).join(', ')}.`
                  : 'Connected, but no alerts are switched on.'
                : INTEGRATION_INFO[item.kind].summary}
            </span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Developers</h2>
      <div className="tiles">
        <Link href={`${base}/api`} className="tile">
          <span className="tile-head">
            <span className="tile-icon">
              <KeyRound aria-hidden="true" />
            </span>
            <span className="tile-name">API and MCP</span>
          </span>
          <span className="tile-body">
            Create API keys for your own scripts and tools, and connect AI assistants to this workspace through Pipemouse’s MCP server.
          </span>
        </Link>
      </div>
    </div>
  );
}
