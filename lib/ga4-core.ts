// Google Analytics 4, through its Measurement Protocol. Pure helpers, shared by the settings
// screen and the server.

export type Ga4Event = 'room_visit' | 'button_click' | 'comment' | 'conversion' | 'test';
export const GA4_EVENT_NAME: Record<Ga4Event, string> = {
  room_visit: 'pipemouse_room_visit',
  button_click: 'pipemouse_button_click',
  comment: 'pipemouse_comment',
  conversion: 'pipemouse_conversion',
  test: 'pipemouse_test',
};
export const GA4_EVENT_LABEL: Record<Exclude<Ga4Event, 'test'>, string> = {
  room_visit: 'A visit to a room starts',
  button_click: 'A visitor clicks one of a room’s buttons',
  comment: 'A visitor leaves a comment or question',
  conversion: 'A visitor accepts and signs the room',
};

/** Checks the two values Google Analytics issues for a web data stream. Throws ga4_id_invalid or ga4_secret_invalid. */
export function parseGa4Config(measurementId: string, apiSecret: string): { measurementId: string; apiSecret: string } {
  const id = measurementId.trim().toUpperCase();
  const secret = apiSecret.trim();
  if (!/^G-[A-Z0-9]{4,20}$/.test(id)) throw new Error('ga4_id_invalid');
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(secret)) throw new Error('ga4_secret_invalid');
  return { measurementId: id, apiSecret: secret };
}

export type Ga4Details = {
  /** The visitor's anonymous id. Google Analytics must not be sent names or email addresses, and is not. */
  visitorId: string;
  room: string;
  workspace: string;
  personalLink?: boolean;
  button?: string;
};

/** The body Google Analytics expects for one event. */
export function ga4Payload(event: Ga4Event, details: Ga4Details) {
  const params: Record<string, string | number> = {
    room: details.room.slice(0, 100),
    workspace: details.workspace.slice(0, 100),
    // Without this, Google Analytics does not count the event as activity.
    engagement_time_msec: 1,
  };
  if (event === 'room_visit') params.personal_link = details.personalLink ? 'yes' : 'no';
  if (event === 'button_click' && details.button) params.button = details.button.replace(/^[a-z]+:\s*/, '').slice(0, 100);
  return { client_id: details.visitorId, events: [{ name: GA4_EVENT_NAME[event], params }] };
}
