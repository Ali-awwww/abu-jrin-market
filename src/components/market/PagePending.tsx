export function PagePending() {
  return (
    <main className="space-y-4 px-4 pt-4" aria-busy="true">
      <div className="h-16 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </main>
  );
}
