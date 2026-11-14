import { Brand } from '@/components/ui/Brand';

export default function RoomNotFound() {
  return (
    <main className="center">
      <div className="card">
        <Brand />
        <h1>This room is no longer available</h1>
        <p className="sub">The link may have changed, or the room may have been taken down. Ask whoever sent it for a new link.</p>
      </div>
    </main>
  );
}
