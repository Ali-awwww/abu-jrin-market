import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { SearchBar } from "@/components/market/SearchBar";
import { MapBox } from "@/components/market/MapBox";
import { OpenBadge } from "@/components/market/OpenBadge";
import { useBuyerLocation } from "@/components/market/useLocation";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIES, fetchOffers, fetchShops, formatDistance, formatSyp, formatUsd, isShopOpen, shopDistance, type Offer,
} from "@/lib/market";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سوق قرية أبو جرين — أرخص الأسعار في دكاكين القرية" },
      { name: "description", content: "ابحث عن أي منتج وقارن أسعار دكاكين أبو جرين بالليرة والدولار، ثم احجز عبر واتساب واستلم بنفسك." },
      { property: "og:title", content: "سوق قرية أبو جرين" },
      { property: "og:description", content: "قارن أسعار دكاكين القرية واحجز للاستلام من الدكان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function cheapestToday(offers: Offer[]) {
  const best = new Map<string, Offer>();
  for (const o of offers) {
    if (o.stock <= 0) continue;
    const cur = best.get(o.name);
    if (!cur || o.price_syp < cur.price_syp) best.set(o.name, o);
  }
  return [...best.values()];
}

function Home() {
  const { user } = useAuth();
  const pos = useBuyerLocation();
  const offers = useQuery({ queryKey: ["offers", "all"], queryFn: () => fetchOffers({}) });
  const shops = useQuery({ queryKey: ["shops"], queryFn: fetchShops });
  const sortedShops = [...(shops.data ?? [])].sort(
    (a, b) => (shopDistance(a, pos) ?? 999) - (shopDistance(b, pos) ?? 999),
  );

  return (
    <main className="space-y-6 px-4 pt-4">
      <header className="flex items-center justify-between gap-3 rounded-2xl bg-hero p-4 text-primary-foreground shadow-soft">
        <div>
          <h1 className="text-2xl font-extrabold">سوق قرية أبو جرين</h1>
          <p className="text-base opacity-90">أسعار دكاكين القرية · استلام من الدكان</p>
        </div>
        {!user && (
          <Link to="/account" className="flex shrink-0 items-center gap-1 rounded-xl bg-card px-4 py-3 text-lg font-bold text-primary">
            <LogIn className="size-5" /> دخول
          </Link>
        )}
      </header>

      <SearchBar />

      <section>
        <h2 className="mb-3 text-xl font-bold">الأقسام</h2>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              to="/search"
              search={{ q: undefined, cat: c.name }}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card py-3 text-lg font-bold shadow-soft active:scale-95"
            >
              <span className="text-3xl">{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">💰 الأرخص اليوم</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cheapestToday(offers.data ?? []).map((o) => (
            <Link
              key={o.id}
              to="/search"
              search={{ q: o.name, cat: undefined }}
              className="w-40 shrink-0 rounded-2xl border-2 border-accent bg-card p-3 shadow-soft"
            >
              <p className="text-xl font-bold">{o.name}</p>
              <p className="text-lg font-extrabold text-primary">{formatSyp(o.price_syp)}</p>
              <p className="text-base text-muted-foreground">{formatUsd(o.price_usd)} / {o.unit}</p>
              <p className="mt-1 text-sm font-medium">🏪 {o.shop.name}</p>
            </Link>
          ))}
          {offers.isLoading && <p className="text-muted-foreground">جارِ التحميل...</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">🏪 الدكاكين القريبة منك</h2>
        <ul className="space-y-2">
          {sortedShops.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">{s.name}</p>
                <span className="text-base text-muted-foreground">{formatDistance(shopDistance(s, pos))}</span>
              </div>
              <p className="text-base text-muted-foreground">📍 {s.address}</p>
              <OpenBadge shop={s} />
            </li>
          ))}
        </ul>
        {shops.data && (
          <p className="mt-2 text-sm text-muted-foreground">
            مفتوح الآن: {shops.data.filter((s) => isShopOpen(s)).length} من {shops.data.length}
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">🗺️ خريطة القرية</h2>
          <Link to="/map" className="text-lg font-bold text-primary">تكبير الخريطة</Link>
        </div>
        <MapBox shops={shops.data ?? []} height={220} />
      </section>
    </main>
  );
}
