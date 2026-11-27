import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { RoomNotes } from '@/components/room/RoomNotes';
import { RoomPlan } from '@/components/room/RoomPlan';
import { RoomViewer } from '@/components/room/RoomViewer';
import { WelcomeNote } from '@/components/room/WelcomeNote';
import { personalizeRoom, renderMerge, type MergeFields } from '@/lib/merge';
import { applyOrder } from '@/lib/optimize';
import { roomBasePath, siteOrigin } from '@/lib/origin';
import { initialItem } from '@/lib/room';
import { normalizeDisplay, publicForm, type Display, type PublicForm } from '@/lib/room-options';
import { loadRoom } from '@/lib/room-server';
import { hasRoomFormProof } from '@/lib/room-visit';
import { createServerSupabase } from '@/lib/supabase/server';

type Params = { workspace: string; track: string; item?: string[] };

const TOKEN = /^[A-Za-z0-9_-]{8,80}$/;

type Branding = { faviconUrl: string | null; footerText: string; footerUrl: string | null; hideFelloMark: boolean };
type Ordering = { order: string[]; next: Record<string, string[]> };
type Extras = { welcome: string; fields: MergeFields | null; branding: Branding; ordering: Ordering | null; display: Display; form: PublicForm | null };

/**
 * The welcome message, the workspace's room branding and, for a visitor with a personal link,
 * their own merge fields. Null when the room is unavailable, including when its workspace is suspended.
 */
const loadExtras = cache(async (workspace: string, track: string, token: string | null): Promise<Extras | null> => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.rpc('public_room_extras', { p_workspace: workspace, p_track: track, p_token: token });
  if (!data) return null;
  const extras = data as { welcome?: string | null; fields?: MergeFields | null; branding?: Partial<Branding> | null; ordering?: Partial<Ordering> | null; display?: unknown; form?: unknown };
  return {
    welcome: extras.welcome ?? '',
    fields: extras.fields ?? null,
    branding: {
      faviconUrl: extras.branding?.faviconUrl ?? null,
      footerText: extras.branding?.footerText ?? '',
      footerUrl: extras.branding?.footerUrl ?? null,
      hideFelloMark: Boolean(extras.branding?.hideFelloMark),
    },
    // Present only for a self-optimising track that has seen enough visits.
    ordering: Array.isArray(extras.ordering?.order) ? { order: extras.ordering.order, next: extras.ordering.next ?? {} } : null,
    display: normalizeDisplay(extras.display),
    form: publicForm(extras.form ?? null),
  };
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { workspace, track } = await params;
  const [room, extras] = await Promise.all([loadRoom(workspace, track), loadExtras(workspace, track, null)]);
  const favicon = extras?.branding.faviconUrl;
  return {
    title: room && extras ? room.track.name : 'Room not available',
    // Rooms are shared by link; keep them out of search results.
    robots: { index: false, follow: false },
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { workspace, track, item } = await params;
  const { r } = await searchParams;
  const loaded = await loadRoom(workspace, track);
  if (!loaded) notFound();

  // The personal-link token comes from the address on first arrival, then from a cookie scoped to this room.
  const store = await cookies();
  const fromCookie = store.get('fello_r')?.value;
  const token = [r, fromCookie].find((value): value is string => typeof value === 'string' && TOKEN.test(value)) ?? null;
  const extras = await loadExtras(workspace, track, token);
  if (!extras) notFound();
  const ordered = extras.ordering ? { ...loaded, items: applyOrder(loaded.items, extras.ordering.order) } : loaded;
  const formDone = hasRoomFormProof(store.get('fello_fp')?.value, workspace, track);
  const known = extras.fields !== null;
  // A form that shows on arrival is a real lock: until it is filled in, the page is sent without
  // any links to the content, so there is nothing behind the form to get at.
  const locked = extras.form?.when === 'start' && !formDone && !known;
  const personalized = personalizeRoom(ordered, extras.fields);
  const room = locked ? { ...personalized, items: personalized.items.map((entry) => ({ ...entry, src: null })) } : personalized;

  const first = initialItem(room, item?.[0]);
  if (!first) {
    return (
      <main className="center">
        <div className="card">
          <h1>{room.track.name}</h1>
          <p className="sub">This room doesn’t have any content yet.</p>
        </div>
      </main>
    );
  }
  const roomOrigin = await siteOrigin(room.workspace.slug);
  const basePath = await roomBasePath(room.workspace.slug, room.track.slug);
  return (
    <>
      <RoomViewer
        room={room}
        initialId={first.id}
        basePath={basePath}
        footer={{ text: extras.branding.footerText, url: extras.branding.footerUrl, showFello: !extras.branding.hideFelloMark }}
        suggestions={extras.ordering?.next}
        display={extras.display}
        form={extras.form ? { ...extras.form, locked } : null}
        formDone={formDone}
        known={known}
        shareUrl={`${roomOrigin}${basePath}`}
      />
      <WelcomeNote text={renderMerge(extras.welcome, extras.fields)} />
      {room.track.published ? (
        <>
          {extras.display.comments ? (
            <RoomNotes
              workspace={room.workspace.slug}
              track={room.track.slug}
              items={room.items.map((entry) => ({ id: entry.id, slug: entry.slug, title: entry.title }))}
              basePath={basePath}
              owner={room.workspace.name}
            />
          ) : null}
          {extras.display.steps ? (
            <RoomPlan workspace={room.workspace.slug} track={room.track.slug} owner={room.workspace.name} showSign={extras.display.sign} />
          ) : null}
        </>
      ) : null}
    </>
  );
}
