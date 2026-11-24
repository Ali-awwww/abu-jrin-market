import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchBar } from "@/components/market/SearchBar";
import { OfferCard } from "@/components/market/OfferCard";
import { useBuyerLocation } from "@/components/market/useLocation";
import { CATEGORIES, cheapestId, fetchOffers, nearestId, shopDistance, sortOffers } from "@/lib/market";

const POPULAR = ["بطاطا", "طماطم", "بصل", "خبز", "سكر", "زيت", "صابون", "لبن", "بيض", "عسل", "زيت زيتون", "علف دجاج", "لحم غنم"];

type S = { q: string | undefined; cat: string | undefined };

export const Route = createFileRoute("/search")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    cat: typeof s["cat"] === "string" && s["cat"] ? s["cat"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "البحث عن منتج — سوق قرية أبو جرين" },
      { name: "description", content: "اعرف أي دكان في أبو جرين يبيع المنتج وبأي سعر، ورتّب حسب الأرخص أو الأقرب." },
      { property: "og:title", content: "البحث في سوق قرية أبو جرين" },
      { property: "og:description", content: "قارن أسعار المنتج في كل دكاكين القرية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, cat } = Route.useSearch();
  const pos = useBuyerLocation();
  const [sort, setSort] = useState<"price" | "distance">("price");
  const active = !!(q || cat);
  const offers = useQuery({
    queryKey: ["offers", q, cat],
    queryFn: () => fetchOffers({ q, category: cat }),
    enabled: active,
  });
  const list = sortOffers(offers.data ?? [], sort, pos);
  const cheap = cheapestId(list);
  const near = nearestId(list, pos);

  return (
    <main className="space-y-4 px-4 pt-4">
      <SearchBar key={q ?? ""} initial={q ?? ""} />
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.name}
            to="/search"
            search={{ q: undefined, cat: c.name }}
            className={`shrink-0 rounded-full border px-4 py-2 text-lg font-bold ${cat === c.name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>

      {!active && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-xl font-bold">اكتب اسم المنتج أو اختر قسماً</p>
          <p className="text-base text-muted-foreground">منتجات يبحث عنها الناس كثيراً:</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <Link key={p} to="/search" search={{ q: p, cat: undefined }} className="rounded-full bg-secondary px-4 py-2 text-lg font-bold">
                {p}
              </Link>
            ))}
          </div>
        </section>
      )}

      {active && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">
              {offers.isLoading ? "جارِ البحث..." : `${list.length} نتيجة ${q ? `لـ «${q}»` : `في ${cat}`}`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSort("price")}
              className={`h-12 rounded-xl text-lg font-bold ${sort === "price" ? "bg-accent text-accent-foreground" : "border border-border bg-card"}`}
            >
              💰 الأرخص أولاً
            </button>
            <button
              onClick={() => setSort("distance")}
              className={`h-12 rounded-xl text-lg font-bold ${sort === "distance" ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
            >
              📍 الأقرب أولاً
            </button>
          </div>
          <div className="space-y-3">
            {list.map((o) => (
              <OfferCard key={o.id} offer={o} cheapest={o.id === cheap} nearest={o.id === near} distance={shopDistance(o.shop, pos)} />
            ))}
            {!offers.isLoading && list.length === 0 && (
              <p className="py-10 text-center text-xl text-muted-foreground">لا يوجد هذا المنتج في دكاكين القرية حالياً</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
