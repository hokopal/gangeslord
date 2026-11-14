import type { ApiCaller } from '../api-keys';
import type { McpTool } from '../mcp';
import { apiCreateLink, apiListLibrary, apiListTracks, apiRecentSessions, apiTrackAnalytics } from './service';

const str = (value: unknown) => (typeof value === 'string' ? value : undefined);

/** The MCP tools for one authenticated workspace. Each is bound to that workspace and cannot reach another. */
export function toolsFor(caller: ApiCaller, origin: string): McpTool[] {
  const ws = caller.workspaceId;
  return [
    {
      name: 'search_library',
      description: 'List content in the workspace library (web pages, PDFs, YouTube videos), newest first. Optionally filter by words in the title.',
      inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words to look for in titles. Omit to list everything.' } }, additionalProperties: false },
      run: (args) => apiListLibrary(ws, str(args.query)),
    },
    {
      name: 'list_tracks',
      description: 'List the workspace’s tracks. A track is an ordered set of content shared with buyers as one room. Returns each track’s id, name and whether it is published.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: () => apiListTracks(ws),
    },
    {
      name: 'get_track_analytics',
      description: 'Engagement for one track: sessions, unique visitors, average active time, binge sessions, button clicks, and per-item reach, time and engagement rate.',
      inputSchema: { type: 'object', properties: { track_id: { type: 'string', description: 'The track’s id, from list_tracks.' } }, required: ['track_id'], additionalProperties: false },
      run: (args) => apiTrackAnalytics(ws, String(args.track_id)),
    },
    {
      name: 'list_recent_visits',
      description: 'The most recent visits to rooms, newest first, with who visited (when known), active time and items opened. Optionally limit to one track.',
      inputSchema: {
        type: 'object',
        properties: {
          track_id: { type: 'string', description: 'Only visits to this track.' },
          limit: { type: 'integer', minimum: 1, maximum: 100, description: 'How many visits to return. Defaults to 25.' },
        },
        additionalProperties: false,
      },
      run: (args) => apiRecentSessions(ws, { trackId: str(args.track_id), limit: typeof args.limit === 'number' ? args.limit : undefined }),
    },
    {
      name: 'create_personal_link',
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
      write: true,
      run: (args) => apiCreateLink(ws, caller.workspaceSlug, String(args.track_id), { name: args.name, email: args.email, company: args.company }, origin),
    },
  ];
}
