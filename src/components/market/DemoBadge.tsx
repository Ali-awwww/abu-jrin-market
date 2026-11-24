export function DemoBadge({ show }: { show?: boolean | null | undefined }) {
  if (!show) return null;
  return (
    <span className="inline-block rounded-full border border-destructive px-2 py-0.5 align-middle text-xs font-bold text-destructive">
      بيانات تجريبية
    </span>
  );
}
