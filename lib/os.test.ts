import { describe, expect, it, vi } from 'vitest';
import { parseCrmSettings } from './crm-core';
import { activityNoteMarkdown, osCompanyInput, osPersonInput, stableUuid, upsertOsNote, upsertOsPerson, type OsConfig } from './os';

vi.mock('./ingest/net', () => ({ assertPublicUrl: vi.fn(async (raw: string) => new URL(raw)) }));

const config: OsConfig = { baseUrl: 'https://os.example.com', apiKey: 'test-key' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const options = (fetchMock: ReturnType<typeof vi.fn>) => ({ fetchImpl: fetchMock as unknown as typeof fetch });

describe('Pipemouse OS settings and payloads', () => {
  it('normalizes the OS address and keeps the key out of the hint', () => {
    const result = parseCrmSettings('pipemouse_os', { baseUrl: 'https://os.example.com/', apiKey: 'abcdefghijklmnop' });
    expect(JSON.parse(result.secret)).toEqual({ baseUrl: 'https://os.example.com', apiKey: 'abcdefghijklmnop' });
    expect(result.hint).toContain('os.example.com');
    expect(result.hint).not.toContain('abcdefghijklmnop');
    expect(() => parseCrmSettings('pipemouse_os', { baseUrl: 'http://localhost:3000', apiKey: 'abcdefghijklmnop' })).toThrow('os_url_invalid');
  });

  it('maps standard form fields without sending custom answers', () => {
    expect(osPersonInput({ email: 'Buyer@Example.com', name: 'Ada Lovelace', jobtitle: 'CTO', phone: '+44 20 1234 5678', custom: 'private' }, 'company-id')).toEqual({
      emails: { primaryEmail: 'buyer@example.com' },
      name: { firstName: 'Ada', lastName: 'Lovelace' },
      jobTitle: 'CTO',
      phone: '+44 20 1234 5678',
      companyId: 'company-id',
    });
    expect(osCompanyInput({ email: 'ada@gmail.com', company: 'Personal' })).toEqual({ name: 'Personal' });
    expect(osCompanyInput({ email: 'ada@example.com', company: 'Example' })).toEqual({ name: 'Example', domainName: { primaryLinkUrl: 'https://example.com' } });
  });

  it('creates deterministic UUIDs for idempotent notes', () => {
    const id = stableUuid('room-visit:123');
    expect(id).toBe(stableUuid('room-visit:123'));
    expect(id).not.toBe(stableUuid('room-visit:456'));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('escapes visitor-supplied markdown in activity notes', () => {
    const note = activityNoteMarkdown({
      trackName: 'Plan [draft]',
      visitor: 'Ada <buyer>',
      startedAt: '2026-11-28T12:00:00.000Z',
      items: [{ title: 'Pricing [old]', seconds: 65, engaged: true }],
      totalItems: 1,
      buttons: ['link: Book [call]'],
      milestones: ['Comment or question left'],
      sessionUrl: 'https://rooms.example.com/w/acme/analytics/track/sessions/session',
    });
    expect(note).toContain('Plan \\[draft\\]');
    expect(note).toContain('Ada \\<buyer\\>');
    expect(note).toContain('1m 05s');
    expect(note).toContain('(engaged)');
    expect(note).toContain('Milestones: Comment or question left');
    expect(note).not.toContain('custom answer');
  });
});

describe('Pipemouse OS API synchronization', () => {
  it('updates an existing person found by exact email', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ data: { people: [{ id: 'existing-person' }] } }))
      .mockResolvedValueOnce(json({ data: { updatePerson: { id: 'existing-person' } } }));
    const result = await upsertOsPerson(config, { email: 'ada@example.com', firstname: 'Ada' }, options(fetchMock));
    expect(result).toEqual({ personId: 'existing-person', companyId: null, created: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstUrl = String(fetchMock.mock.calls[0][0]);
    expect(firstUrl).toContain('/rest/people?');
    expect(decodeURIComponent(firstUrl)).toContain('emails.primaryEmail[eq]:"ada@example.com"');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ emails: { primaryEmail: 'ada@example.com' } });
  });

  it('creates a missing deterministic note and links it to the person', async () => {
    const noteId = stableUuid('room-visit:session-1');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ messages: ['Record not found'] }, 404))
      .mockResolvedValueOnce(json({ data: { createNote: { id: noteId } } }, 201))
      .mockResolvedValueOnce(json({ data: { updateNoteTarget: { id: 'target' } } }));
    await upsertOsNote(config, { id: noteId, title: 'Room visit', markdown: 'Activity', personId: 'person-1', companyId: null }, options(fetchMock));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH' });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ id: noteId, bodyV2: { markdown: 'Activity' } });
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toMatchObject({ noteId, targetPersonId: 'person-1' });
    expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).not.toHaveProperty('targetCompanyId');
  });
});
