export function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {note ? <div className="stat-note">{note}</div> : null}
    </div>
  );
}

/** A horizontal bar for a 0-to-1 ratio, with the percentage beside it. */
export function RatioBar({ ratio }: { ratio: number }) {
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="bar">
      <div className="bar-track" role="presentation">
        <div className="bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="bar-value">{percent}%</span>
    </div>
  );
}

export const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
