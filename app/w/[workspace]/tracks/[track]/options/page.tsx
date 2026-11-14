import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { getRoomOptions, listSubmissions } from '@/lib/forms-server';
import { errorMessage } from '@/lib/messages';
import { can } from '@/lib/roles';
import { FORM_FIELDS, MAX_CUSTOM_FIELDS } from '@/lib/room-options';
import { getTrackDetail } from '@/lib/tracks';
import { getWorkspaceContext } from '@/lib/workspaces';
import { saveRoomOptionsAction } from './actions';

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function RoomOptionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; track: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspace: slug, track: trackId } = await params;
  const { error, saved } = await searchParams;
  const context = await getWorkspaceContext(slug);
  if (!context) notFound();
  const { workspace, role } = context;
  const detail = /^[0-9a-f-]{36}$/.test(trackId) ? await getTrackDetail(workspace.id, trackId) : null;
  const options = detail ? await getRoomOptions(workspace.id, detail.track.id) : null;
  if (!detail || !options) notFound();
  const { track } = detail;
  const { display, form } = options;
  const submissions = await listSubmissions(workspace.id, track.id);
  const editable = can(role, 'content.write');
  const modeOf = (key: string) => {
    const field = form.fields.find((f) => f.key === key);
    return field ? (field.required ? 'required' : 'optional') : 'off';
  };

  return (
    <div className="page page-wide">
      <Link href={`/w/${workspace.slug}/tracks/${track.id}`} className="back">
        <ArrowLeft aria-hidden="true" /> {track.name}
      </Link>
      <h1 className="page-title">Room options</h1>
      <p className="page-subtitle">How this room looks to buyers, and whether it asks who they are.</p>
      {error ? (
        <p className="notice notice-error" role="alert">
          {errorMessage(error)}
        </p>
      ) : null}
      {saved ? (
        <p className="notice" role="status">
          Saved. Open rooms pick it up on their next load.
        </p>
      ) : null}

      <form action={saveRoomOptionsAction} style={{ maxWidth: 760 }}>
        <input type="hidden" name="workspace" value={workspace.slug} />
        <input type="hidden" name="track" value={track.id} />
        <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }}>
          <h2 className="section-title">Display</h2>
          <label className="check-row">
            <input type="checkbox" name="progress" defaultChecked={display.progress} />
            <span>
              <span style={{ fontWeight: 500 }}>Show progress</span>
              <span className="hint" style={{ display: 'block' }}>
                A progress bar and a tick beside each item the buyer has opened.
              </span>
            </span>
          </label>
          <label className="check-row">
            <input type="checkbox" name="numbers" defaultChecked={display.numbers} />
            <span>
              <span style={{ fontWeight: 500 }}>Number the items</span>
              <span className="hint" style={{ display: 'block' }}>
                Shows 1, 2, 3 in place of the content-type icons. Useful when the order is the point.
              </span>
            </span>
          </label>
          <label className="check-row">
            <input type="checkbox" name="share" defaultChecked={display.share} />
            <span>
              <span style={{ fontWeight: 500 }}>Show share buttons</span>
              <span className="hint" style={{ display: 'block' }}>
                LinkedIn, X, email and copy link. They share the room’s public address, never a buyer’s personal link.
              </span>
            </span>
          </label>
          <p className="hint">Every room also has previous and next buttons, an item counter, and left and right arrow-key navigation.</p>

          <h2 className="section-title">Lead form</h2>
          <label className="check-row">
            <input type="checkbox" name="formEnabled" defaultChecked={form.enabled} />
            <span>
              <span style={{ fontWeight: 500 }}>Ask visitors who they are</span>
              <span className="hint" style={{ display: 'block' }}>
                The form covers the room until it is filled in. Buyers who arrive on a personal link are never asked, because you
                already know who they are.
              </span>
            </span>
          </label>

          <p className="label" style={{ marginTop: 12 }}>
            Show the form
          </p>
          <label className="check-row">
            <input type="radio" name="when" value="start" defaultChecked={form.when === 'start'} />
            <span>As soon as the room opens</span>
          </label>
          <label className="check-row">
            <input type="radio" name="when" value="time" defaultChecked={form.when === 'time'} />
            <span className="option-inline">
              After <input type="number" name="seconds" className="input" min={5} max={3600} defaultValue={form.seconds} aria-label="Seconds in the room" /> seconds in the room
            </span>
          </label>
          <label className="check-row">
            <input type="radio" name="when" value="items" defaultChecked={form.when === 'items'} />
            <span className="option-inline">
              After <input type="number" name="items" className="input" min={1} max={50} defaultValue={form.items} aria-label="Items opened" /> items, as they open the next one
            </span>
          </label>

          <div className="field" style={{ marginTop: 12, maxWidth: 420 }}>
            <label className="label" htmlFor="heading">
              Heading
            </label>
            <input id="heading" name="heading" className="input" maxLength={80} defaultValue={form.heading} />
          </div>
          <div className="field" style={{ maxWidth: 420 }}>
            <label className="label" htmlFor="intro">
              Line under the heading (optional)
            </label>
            <input id="intro" name="intro" className="input" maxLength={240} defaultValue={form.intro} />
          </div>
          <div className="field" style={{ maxWidth: 420 }}>
            <label className="label" htmlFor="button">
              Button label
            </label>
            <input id="button" name="button" className="input" maxLength={40} defaultValue={form.button} />
          </div>

          <p className="label">Fields</p>
          <div className="option-fields">
            {FORM_FIELDS.map((field) => (
              <label key={field.key} className="field" style={{ marginBottom: 0 }}>
                <span className="hint">{field.label}</span>
                {field.key === 'email' ? (
                  <select className="select" disabled defaultValue="required" aria-label={field.label}>
                    <option value="required">Required</option>
                  </select>
                ) : (
                  <select name={`field-${field.key}`} className="select" defaultValue={modeOf(field.key)} aria-label={field.label}>
                    <option value="off">Don’t ask</option>
                    <option value="optional">Optional</option>
                    <option value="required">Required</option>
                  </select>
                )}
              </label>
            ))}
          </div>

          <p className="label">Your own questions</p>
          <div className="option-fields" style={{ gridTemplateColumns: 'minmax(0, 1fr) 140px', maxWidth: 560 }}>
            {Array.from({ length: MAX_CUSTOM_FIELDS }, (_, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <input name={`custom-label-${i + 1}`} className="input" maxLength={80} defaultValue={form.custom[i]?.label ?? ''} placeholder={`Question ${i + 1}, for example: Team size`} aria-label={`Question ${i + 1}`} />
                <select name={`custom-mode-${i + 1}`} className="select" defaultValue={form.custom[i]?.required ? 'required' : 'optional'} aria-label={`Question ${i + 1} is`}>
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                </select>
              </div>
            ))}
          </div>
          <p className="hint">Each is answered in one line of text. Leave a row empty to not ask it.</p>

          <div className="field" style={{ marginTop: 12, maxWidth: 560 }}>
            <label className="label" htmlFor="consent">
              Consent statement (optional)
            </label>
            <input id="consent" name="consent" className="input" maxLength={300} defaultValue={form.consent} placeholder="For example: I agree to be contacted about this." />
            <span className="hint">When filled in, visitors must tick a box beside this statement, and each submission records that they did.</span>
          </div>

          <h2 className="section-title">Send submissions to</h2>
          <label className="check-row">
            <input type="checkbox" name="hubspot" defaultChecked={form.hubspot} />
            <span>
              <span style={{ fontWeight: 500 }}>HubSpot</span>
              <span className="hint" style={{ display: 'block' }}>
                Creates the contact, or updates it if that email already exists. Needs HubSpot connected under Integrations.
              </span>
            </span>
          </label>
          <div className="field" style={{ maxWidth: 560 }}>
            <label className="label" htmlFor="webhook">
              Webhook address (optional)
            </label>
            <input id="webhook" name="webhook" className="input" placeholder={form.webhookSet ? 'An address is saved. Paste a new one to replace it.' : 'https://…'} spellCheck={false} autoComplete="off" />
            <span className="hint">
              Each submission is posted here as JSON. Paste a Clay table’s webhook address to feed it into Clay; Zapier and Make
              work the same way. The address is stored encrypted and is not shown again once saved.
            </span>
          </div>
          {form.webhookSet ? (
            <label className="check-row">
              <input type="checkbox" name="removeWebhook" />
              <span>Remove the saved webhook address</span>
            </label>
          ) : null}
          {editable ? (
            <SubmitButton className="btn btn-primary" pendingLabel="Saving…">
              Save options
            </SubmitButton>
          ) : null}
        </fieldset>
      </form>

      <h2 className="section-title">Submissions</h2>
      {submissions.length > 0 ? (
        <p style={{ marginBottom: 8 }}>
          <a className="btn btn-sm" href={`/w/${workspace.slug}/tracks/${track.id}/options/export`}>
            Download as CSV
          </a>
        </p>
      ) : null}
      {submissions.length === 0 ? (
        <p className="hint">No one has filled in this room’s form yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Company</th>
                <th>Job title</th>
                <th>Phone</th>
                <th>Their answers</th>
                <th>Submitted</th>
                <th>HubSpot</th>
                <th>Webhook</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row) => (
                <tr key={row.id}>
                  <td>{row.email}</td>
                  <td>{[row.fields.firstname, row.fields.lastname].filter(Boolean).join(' ')}</td>
                  <td>{row.fields.company ?? ''}</td>
                  <td>{row.fields.jobtitle ?? ''}</td>
                  <td>{row.fields.phone ?? ''}</td>
                  <td style={{ maxWidth: 260 }}>
                    {form.custom.filter((q) => row.fields[q.key]).map((q) => (
                      <span key={q.key} style={{ display: 'block' }}>
                        <span className="hint">{q.label}:</span> {row.fields[q.key]}
                      </span>
                    ))}
                    {row.fields.consent === 'yes' ? <span className="hint">Agreed to the consent statement</span> : null}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatWhen(row.createdAt)}</td>
                  <td>{row.hubspotStatus ?? ''}</td>
                  <td>{row.webhookStatus ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
