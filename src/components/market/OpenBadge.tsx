import { hoursLabel, isShopOpen, type Shop } from "@/lib/market";

export function OpenBadge({ shop }: { shop: Shop }) {
  const open = isShopOpen(shop);
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span
        className={`rounded-full px-2.5 py-0.5 font-bold ${open ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"}`}
      >
        {open ? "مفتوح الآن" : "مغلق الآن"}
      </span>
      <span className="text-muted-foreground">🕒 {hoursLabel(shop)}</span>
    </span>
  );
}
