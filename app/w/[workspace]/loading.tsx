/** Shown while a workspace page loads, so navigation never looks frozen. */
export default function WorkspaceLoading() {
  return (
    <div className="page page-wide" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ width: 220, height: 34, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 380, maxWidth: '100%', height: 16, marginBottom: 32 }} />
      {[0, 1, 2, 3, 4].map((row) => (
        <div key={row} className="skeleton" style={{ height: 36, marginBottom: 8, opacity: 1 - row * 0.15 }} />
      ))}
    </div>
  );
}
