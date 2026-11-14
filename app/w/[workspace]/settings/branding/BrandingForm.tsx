'use client';

import { useState } from 'react';
import { SubmitButton } from '@/components/ui/SubmitButton';
import type { Branding } from '@/lib/branding';
import { saveBrandingAction } from './actions';

const DEFAULT_COLOR = '#2383e2';

/** Branding fields with a live preview of how a room's sidebar will look. */
export function BrandingForm({ workspaceSlug, workspaceName, initial }: { workspaceSlug: string; workspaceName: string; initial: Branding }) {
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [useColor, setUseColor] = useState(initial.brandColor !== '');
  const [color, setColor] = useState(initial.brandColor || DEFAULT_COLOR);
  const [footerText, setFooterText] = useState(initial.footerText);
  const [hideMark, setHideMark] = useState(initial.hideFelloMark);
  const accent = useColor ? color : DEFAULT_COLOR;

  return (
    <form action={saveBrandingAction} className="branding-grid">
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <div>
        <div className="field">
          <label className="label" htmlFor="logoUrl">
            Logo link
          </label>
          <input id="logoUrl" name="logoUrl" className="input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://yourcompany.com/logo.svg" />
          <span className="hint">A link to an image that starts with https://. Shown at the top of every room. Leave empty to show the workspace name.</span>
        </div>
        <div className="field">
          <label className="check-row" style={{ padding: 0 }}>
            <input type="checkbox" name="useColor" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} />
            <span style={{ fontWeight: 500 }}>Use a brand colour for buttons and highlights in rooms</span>
          </label>
          {useColor ? (
            <div className="row-form" style={{ marginTop: 8 }}>
              <input type="color" name="brandColor" aria-label="Brand colour" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 44, height: 32, padding: 0, border: 0, background: 'none' }} />
              <code>{color}</code>
            </div>
          ) : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="faviconUrl">
            Browser tab icon link
          </label>
          <input id="faviconUrl" name="faviconUrl" className="input" defaultValue={initial.faviconUrl} placeholder="https://yourcompany.com/favicon.png" />
          <span className="hint">Shown in the buyer’s browser tab for your rooms. Leave empty for the Pipemouse icon.</span>
        </div>
        <div className="field">
          <label className="label" htmlFor="footerText">
            Footer line
          </label>
          <input id="footerText" name="footerText" className="input" maxLength={200} value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Privacy policy" />
        </div>
        <div className="field">
          <label className="label" htmlFor="footerUrl">
            Footer link (optional)
          </label>
          <input id="footerUrl" name="footerUrl" className="input" defaultValue={initial.footerUrl} placeholder="https://yourcompany.com/privacy" />
        </div>
        <label className="check-row">
          <input type="checkbox" name="hideFelloMark" checked={hideMark} onChange={(e) => setHideMark(e.target.checked)} />
          <span>
            <span style={{ fontWeight: 500 }}>Hide “Powered by Pipemouse” in rooms</span>
          </span>
        </label>
        <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
          Save branding
        </SubmitButton>
      </div>

      <div className="brand-preview" aria-label="Preview of a room’s sidebar">
        <div className="brand-preview-logo">
          {logoUrl.trim().startsWith('https://') ? (
            // eslint-disable-next-line @next/next/no-img-element -- workspace-supplied logo of unknown size
            <img src={logoUrl.trim()} alt="" />
          ) : (
            <span>{workspaceName}</span>
          )}
        </div>
        <div className="hint" style={{ margin: '10px 0 6px' }}>
          Room title
        </div>
        <div className="brand-preview-item" style={{ borderColor: accent }}>
          First item
        </div>
        <div className="brand-preview-item">Second item</div>
        <span className="btn btn-block" style={{ background: accent, color: '#fff', borderColor: accent, marginTop: 12 }}>
          Book a demo
        </span>
        <div className="room-footer" style={{ marginTop: 12 }}>
          {footerText.trim() ? <span>{footerText.trim()}</span> : null}
          {hideMark ? null : <span>Powered by Pipemouse</span>}
        </div>
      </div>
    </form>
  );
}
