import type { ApiCaller } from '../api-keys';
import type { McpTool } from '../mcp';
import {
  apiCreateLink, apiGetLibraryItem, apiGetTrack, apiListGuestNotes, apiListLibrary, apiListTracks, apiRecentSessions, apiTrackAnalytics,
} from './service';
import {
  apiAddAssetFromUrl, apiAddItem, apiAddPdf, apiCreateTrack, apiDeleteAsset, apiDeleteTrack, apiMoveItem, apiRemoveItem, apiSetCta, apiSetPublished, apiUpdateAsset, apiUpdateItem, apiUpdateTrack,
} from './write';

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);
const strOr = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const bool = (value: unknown) => (typeof value === 'boolean' ? value : undefined);
const num = (value: unknown) => (typeof value === 'number' ? value : undefined);

const done = async (op: Promise<void>): Promise<{ ok: true }> => { await op; return { ok: true }; };

const listOutput: McpTool['outputSchema'] = { type: 'object', properties: { items: { type: 'array' } }, additionalProperties: false };
const objectOutput: McpTool['outputSchema'] = { type: 'object', additionalProperties: true };
const okOutput: McpTool['outputSchema'] = { type: 'object', properties: { ok: { type: 'boolean' } }, additionalProperties: false };

/** The MCP tools for one authenticated workspace. Each is bound to that workspace and cannot reach another. */
export function toolsFor(caller: ApiCaller, origin: string): McpTool[] {
  const ws = caller.workspaceId;
  return [
    {
      name: 'search_library',
      title: 'Search library',
      description: 'List content in the workspace library (web pages, PDFs, YouTube videos), newest first. Optionally filter by words in the title, description or extracted text.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to look for. Omit to list everything.' } }, additionalProperties: false },
      outputSchema: listOutput,
      run: (args) => apiListLibrary(ws, str(args.query)),
    },
    {
      name: 'get_library_item',
      title: 'Get library item',
      description: 'Read one library item: its title, type, status, source URL, description and a text excerpt.',
      inputSchema: { type: 'object', properties: { asset_id: { type: 'string', description: 'The library item id.' } }, required: ['asset_id'], additionalProperties: false },
      outputSchema: objectOutput,
      run: (args) => apiGetLibraryItem(ws, String(args.asset_id)),
    },
    {
      name: 'list_tracks',
      title: 'List tracks',
      description: 'List the workspace’s tracks. A track is an ordered set of content shared with buyers as one room. Returns each track’s id, name, slug and whether it is published.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: listOutput,
      run: () => apiListTracks(ws),
    },
    {
      name: 'get_track',
      title: 'Get track',
      description: 'Read one track in full: its metadata, ordered items, and call-to-action buttons.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string', description: 'The track’s id, from list_tracks.' } }, required: ['track_id'], additionalProperties: false },
      outputSchema: objectOutput,
      run: (args) => apiGetTrack(ws, String(args.track_id)),
    },
    {
      name: 'get_track_analytics',
      title: 'Get track analytics',
      description: 'Engagement for one track: sessions, unique visitors, average active time, binge sessions, button clicks, and per-item reach, time and engagement rate.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string', description: 'The track’s id, from list_tracks.' } }, required: ['track_id'], additionalProperties: false },
      outputSchema: objectOutput,
      run: (args) => apiTrackAnalytics(ws, String(args.track_id)),
    },
    {
      name: 'list_recent_visits',
      title: 'List recent visits',
      description: 'The most recent visits to rooms, newest first, with who visited (when known), active time and items opened. Optionally limit to one track.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string', description: 'Only visits to this track.' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: 'How many visits to return. Defaults to 25.' },
        },
        additionalProperties: false,
      },
      outputSchema: listOutput,
      run: (args) => apiRecentSessions(ws, { trackId: str(args.track_id), limit: typeof args.limit === 'number' ? args.limit : undefined }),
    },
    {
      name: 'list_guest_notes',
      title: 'List guest notes',
      description: 'Buyer comments, questions and markup on a track, newest first, with author details and reply status.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string', description: 'The track’s id.' } }, required: ['track_id'], additionalProperties: false },
      outputSchema: listOutput,
      run: (args) => apiListGuestNotes(ws, String(args.track_id)),
    },
    {
      name: 'create_personal_link',
      title: 'Create personal link',
      description: 'Create a personal link to a track’s room for one named recipient. Visits through the link are attributed to them. Returns the link to send.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string', description: 'The track’s id, from list_tracks.' },
          name: { type: 'string', description: 'The recipient’s name.' },
          email: { type: 'string', description: 'The recipient’s email address (optional).' },
          company: { type: 'string', description: 'The recipient’s company (optional).' },
        },
        required: ['track_id', 'name'],
        additionalProperties: false,
      },
      outputSchema: objectOutput,
      write: true,
      run: (args) => apiCreateLink(ws, caller.workspaceSlug, String(args.track_id), { name: args.name, email: args.email, company: args.company }, origin),
    },
    {
      name: 'add_library_url',
      title: 'Add library item from URL',
      description: 'Add a web page, PDF or YouTube video to the workspace library from its URL. Returns the new library item.',
      inputSchema: { type: 'object', properties: { url: { type: 'string', description: 'The URL of the page, PDF or YouTube video.' } }, required: ['url'], additionalProperties: false },
      outputSchema: objectOutput,
      write: true,
      run: (args) => apiAddAssetFromUrl(ws, String(args.url), origin),
    },
    {
      name: 'add_library_pdf',
      title: 'Upload PDF to library',
      description: 'Upload a PDF file (as base64) to the workspace library.',
      inputSchema: {
        type: 'object',
        properties: {
          filename: { type: 'string', description: 'The file name, used for the item title.' },
          base64: { type: 'string', description: 'The PDF contents, base64 encoded.' },
        },
        required: ['filename', 'base64'],
        additionalProperties: false,
      },
      outputSchema: objectOutput,
      write: true,
      run: (args) => apiAddPdf(ws, String(args.filename), String(args.base64)),
    },
    {
      name: 'update_library_item',
      title: 'Update library item',
      description: 'Update a library item’s title, description, slug or engagement threshold. Omitted fields are left unchanged.',
      inputSchema: {
        type: 'object',
        properties: {
          asset_id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          slug: { type: 'string' },
          threshold_seconds: { type: 'integer', minimum: 1, maximum: 3600 },
        },
        required: ['asset_id'],
        additionalProperties: false,
      },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiUpdateAsset(ws, String(args.asset_id), { title: str(args.title), description: str(args.description), slug: str(args.slug), thresholdSeconds: num(args.threshold_seconds) })),
    },
    {
      name: 'delete_library_item',
      title: 'Delete library item',
      description: 'Delete a library item and its stored file.',
      inputSchema: { type: 'object', properties: { asset_id: { type: 'string' } }, required: ['asset_id'], additionalProperties: false },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiDeleteAsset(ws, String(args.asset_id))),
    },
    {
      name: 'create_track',
      title: 'Create track',
      description: 'Create a new track in the workspace.',
      inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'], additionalProperties: false },
      outputSchema: objectOutput,
      write: true,
      run: (args) => apiCreateTrack(ws, String(args.name)),
    },
    {
      name: 'update_track',
      title: 'Update track',
      description: 'Update a track’s name, slug, header title or next-button setting. Omitted fields are left unchanged.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
          header_title: { type: 'string' },
          show_next_button: { type: 'boolean' },
        },
        required: ['track_id'],
        additionalProperties: false,
      },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiUpdateTrack(ws, String(args.track_id), { name: str(args.name), slug: str(args.slug), headerTitle: str(args.header_title), showNextButton: bool(args.show_next_button) })),
    },
    {
      name: 'set_track_published',
      title: 'Publish or unpublish track',
      description: 'Publish a track (it must have at least one item) or unpublish it back to draft.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string' }, published: { type: 'boolean' } }, required: ['track_id', 'published'], additionalProperties: false },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiSetPublished(ws, String(args.track_id), args.published === true)),
    },
    {
      name: 'delete_track',
      title: 'Delete track',
      description: 'Delete a track from the workspace.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string' } }, required: ['track_id'], additionalProperties: false },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiDeleteTrack(ws, String(args.track_id))),
    },
    {
      name: 'add_item_to_track',
      title: 'Add item to track',
      description: 'Add a ready library item to the end of a track.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string' }, asset_id: { type: 'string' } }, required: ['track_id', 'asset_id'], additionalProperties: false },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiAddItem(ws, String(args.track_id), String(args.asset_id))),
    },
    {
      name: 'remove_item_from_track',
      title: 'Remove item from track',
      description: 'Remove an item from a track.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string' }, item_id: { type: 'string' } }, required: ['track_id', 'item_id'], additionalProperties: false },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiRemoveItem(ws, String(args.track_id), String(args.item_id))),
    },
    {
      name: 'update_track_item',
      title: 'Update track item',
      description: 'Update a track item’s title override, description override or slug. Omitted fields are left unchanged.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string' },
          item_id: { type: 'string' },
          title_override: { type: 'string' },
          description_override: { type: 'string' },
          slug: { type: 'string' },
        },
        required: ['track_id', 'item_id'],
        additionalProperties: false,
      },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiUpdateItem(ws, String(args.track_id), String(args.item_id), { titleOverride: str(args.title_override), descriptionOverride: str(args.description_override), slug: str(args.slug) })),
    },
    {
      name: 'move_track_item',
      title: 'Move track item',
      description: 'Move a track item to a new zero-based position in the track.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string' },
          item_id: { type: 'string' },
          to_index: { type: 'integer', minimum: 0 },
        },
        required: ['track_id', 'item_id', 'to_index'],
        additionalProperties: false,
      },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiMoveItem(ws, String(args.track_id), String(args.item_id), Number(args.to_index))),
    },
    {
      name: 'set_track_cta',
      title: 'Set track CTA',
      description: 'Set, replace or remove a call-to-action button on a track (header, sidebar or a specific item). Empty label and url removes it.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string' },
          placement: { type: 'string', enum: ['header', 'sidebar', 'item'] },
          item_id: { type: 'string', description: 'Required when placement is item.' },
          label: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['track_id', 'placement'],
        additionalProperties: false,
      },
      outputSchema: okOutput,
      write: true,
      run: (args) => done(apiSetCta(ws, String(args.track_id), String(args.placement) as 'header' | 'sidebar' | 'item', str(args.item_id) ?? null, strOr(args.label), strOr(args.url))),
    },
  ];
}
