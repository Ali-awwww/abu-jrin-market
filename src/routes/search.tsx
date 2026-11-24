import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SearchBar } from "@/components/market/SearchBar";
import { OfferCard } from "@/components/market/OfferCard";
import { useBuyerLocation } from "@/components/market/useLocation";
import { CATEGORIES, categoryByName, cheapestId, fetchOffers, nearestId, shopDistance, sortOffers } from "@/lib/market";

const POPULAR = ["بطاطا", "طماطم", "بصل", "خبز", "سكر", "زيت", "صابون", "لبن", "بيض", "عسل", "زيت زيتون", "علف دجاج", "لحم غنم", "إسمنت"];

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
  });
  const list = offers.data ?? [];
  const sorted = sortOffers(list, sort, pos);
  const cheap = cheapestId(list);
  const near = nearestId(list, pos);
  const selectedCategory = categoryByName(cat);
  return (
    <main className="space-y-4 px-4 pt-4">
      <h1 className="text-2xl font-extrabold">بحث وتصفية</h1>
      <SearchBar />
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          to="/search"
          search={{ q, cat: undefined }}
          className={`shrink-0 rounded-full border px-4 py-2 text-base font-bold ${!cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
        >
          الكل
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c.name}
            to="/search"
            search={{ q, cat: c.name }}
            title={c.description}
            className={`shrink-0 rounded-full border px-4 py-2 text-base font-bold ${cat === c.name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {c.icon} {c.name}
          </Link>
        ))}
      </div>
      {selectedCategory && (
        <p className="rounded-2xl border border-border bg-card p-3 text-base text-muted-foreground shadow-soft">
          {selectedCategory.icon} {selectedCategory.name}: {selectedCategory.description}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={() => setSort("price")} className={`flex-1 rounded-2xl border px-3 py-2 text-base font-bold ${sort === "price" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
          الأرخص أولاً
        </button>
        <button onClick={() => setSort("distance")} className={`flex-1 rounded-2xl border px-3 py-2 text-base font-bold ${sort === "distance" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
          الأقرب أولاً
        </button>
      </div>
      {!active && (
        <div>
          <h2 className="mb-2 text-xl font-bold">يبحث عنه أهل القرية</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR.map((p) => (
              <Link key={p} to="/search" search={{ q: p, cat: undefined }} className="rounded-full border border-border bg-card px-4 py-2 text-base font-bold">
                {p}
              </Link>
            ))}
          </div>
        </div>
      )}
      {offers.isPending ? (
        <p className="py-6 text-center text-lg text-muted-foreground">جارٍ البحث...</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-center text-lg text-muted-foreground shadow-soft">
          <p className="font-bold text-foreground">لا توجد نتائج</p>
          <p className="mt-1">جرّب كلمة أخرى، أو أزل التصفية، أو اطلب المنتج من دكانك.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              cheapest={o.id === cheap}
              nearest={o.id === near}
              distance={shopDistance(o.shop, pos)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
