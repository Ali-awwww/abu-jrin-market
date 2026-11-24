import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapBox } from "@/components/market/MapBox";
import { DemoBadge } from "@/components/market/DemoBadge";
import { OpenBadge } from "@/components/market/OpenBadge";
import { directionsLink, fetchShops } from "@/lib/market";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "خريطة دكاكين أبو جرين — سوق القرية" },
      { name: "description", content: "خريطة قرية أبو جرين قرب السفيرة في محافظة حلب مع مواقع كل الدكاكين والاتجاهات إليها." },
      { property: "og:title", content: "خريطة دكاكين قرية أبو جرين" },
      { property: "og:description", content: "مواقع دكاكين القرية والاتجاهات إليها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const shops = useQuery({ queryKey: ["shops"], queryFn: fetchShops });
  return (
    <main className="space-y-4 px-4 pt-4">
      <h1 className="text-2xl font-extrabold">🗺️ خريطة قرية أبو جرين</h1>
      <p className="text-muted-foreground">قرية أبو جرين قرب السفيرة في محافظة حلب.</p>
      <MapBox shops={shops.data ?? []} height="55vh" />
      <ul className="space-y-2">
        {(shops.data ?? []).map((s) => (
          <li key={s.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
            <p className="text-lg font-bold">{s.name} <DemoBadge show={s.is_demo} /></p>
            <p className="text-base text-muted-foreground">📍 {s.address}</p>
            <OpenBadge shop={s} />
            <a href={directionsLink(s)} target="_blank" rel="noopener" className="mt-2 block text-lg font-bold text-primary">
              🧭 الاتجاهات في خرائط جوجل
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
