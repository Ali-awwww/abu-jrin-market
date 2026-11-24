import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { SearchBar } from "@/components/market/SearchBar";
import { MapBox } from "@/components/market/MapBox";
import { DemoBadge } from "@/components/market/DemoBadge";
import { OpenBadge } from "@/components/market/OpenBadge";
import { useBuyerLocation } from "@/components/market/useLocation";
import { useAuth } from "@/lib/auth";
import {
  CATEGORIES,
  fetchOffers,
  fetchShops,
  formatDistance,
  formatSyp,
  formatUsd,
  isShopOpen,
  shopDistance,
  type Offer,
} from "@/lib/market";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "سوق قرية أبو جرين — أرخص الأسعار في دكاكين القرية" },
      { name: "description", content: "ابحث عن أي منتج وقارن أسعار دكاكين أبو جرين قرب السفيرة في محافظة حلب بالليرة والدولار، ثم احجز عبر واتساب واستلم بنفسك." },
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
  const pos = useBuyerLocation();
  const { user } = useAuth();
  const qOffers = useQuery({ queryKey: ["offers"], queryFn: () => fetchOffers({}) });
  const qShops = useQuery({ queryKey: ["shops"], queryFn: fetchShops });
  const offers = qOffers.data ?? [];
  const shops = qShops.data ?? [];
  const loading = qOffers.isPending || qShops.isPending;
  const open = shops.filter((s) => isShopOpen(s));
  const best = cheapestToday(offers).slice(0, 8);
  return (
    <main className="space-y-4 px-4 pt-4">
      <section className="rounded-3xl border border-primary/20 bg-primary px-4 py-5 text-center text-primary-foreground shadow-soft">
        <h1 className="text-3xl font-extrabold leading-snug">سوق قرية أبو جرين</h1>
        <p className="mt-1 text-xl font-medium">قارن أسعار دكاكين القرية، واحجز عبر واتساب، واستلم من الدكان.</p>
      </section>
      <SearchBar />
      <section>
        <h2 className="mb-2 text-xl font-bold">الأقسام</h2>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <Link
              key={c.name}
              to="/search"
              search={{ q: undefined, cat: c.name }}
              title={c.description}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-2 py-3 text-center shadow-soft active:scale-95"
            >
              <span className="text-3xl">{c.icon}</span>
              <span className="text-base font-bold leading-tight">{c.name}</span>
              <span className="text-sm font-normal leading-snug text-muted-foreground">{c.description}</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">أرخص العروض اليوم</h2>
          <Link to="/search" search={{ q: undefined, cat: undefined }} className="text-base font-bold text-primary underline">
            عرض الكل
          </Link>
        </div>
        {loading ? (
          <p className="py-6 text-center text-lg text-muted-foreground">جارٍ التحميل...</p>
        ) : best.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-center text-lg text-muted-foreground shadow-soft">
            لا توجد عروض بعد.
          </p>
        ) : (
          <div className="space-y-2">
            {best.map((o) => {
              const d = shopDistance(o.shop, pos);
              return (
                <Link
                  key={o.id}
                  to="/product/$productId"
                  params={{ productId: o.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft active:scale-[0.99]"
                >
                  {o.photoSrc ? (
                    <img src={o.photoSrc} alt={o.name} className="size-16 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">
                      🧺
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">
                      {o.name} <span className="text-sm text-muted-foreground">· {o.category}</span>
                    </p>
                    <p className="text-xl font-extrabold text-primary">{formatSyp(o.price_syp)}</p>
                    <p className="text-base text-muted-foreground">
                      {formatUsd(o.price_usd)} / {o.unit} · 🏪 {o.shop.name} <DemoBadge show={o.shop.is_demo} />
                    </p>
                  </div>
                  {d != null && <span className="shrink-0 text-sm text-muted-foreground">{formatDistance(d)}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold">دكاكين القرية</h2>
          <Link to="/map" className="text-base font-bold text-primary underline">
            خريطة الدكاكين
          </Link>
        </div>
        {loading ? (
          <p className="py-6 text-center text-lg text-muted-foreground">جارٍ التحميل...</p>
        ) : shops.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-center text-lg text-muted-foreground shadow-soft">
            لا توجد دكاكين بعد.
          </p>
        ) : (
          <div className="space-y-2">
            {shops.map((s) => (
              <Link key={s.id} to="/shop/$shopId" params={{ shopId: s.id }} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft active:scale-[0.99]">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl">🏪</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">
                    {s.name} <DemoBadge show={s.is_demo} />
                  </p>
                  <p className="truncate text-base text-muted-foreground">{s.address}</p>
                </div>
                <OpenBadge shop={s} />
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <p className="text-base font-bold">
          دكاكين مفتوحة الآن: {open.length} من أصل {shops.length}
        </p>
        <p className="mt-1 text-base text-muted-foreground">الاستلام من الدكان فقط · الدفع نقداً عند الاستلام</p>
        {!user && (
          <Link to="/account" className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-lg font-bold text-primary-foreground">
            <LogIn className="size-5" /> تسجيل الدخول / إنشاء حساب
          </Link>
        )}
      </section>
      <MapBox shops={shops} />
    </main>
  );
}
