import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, MessageCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MapBox } from "@/components/market/MapBox";
import { OpenBadge } from "@/components/market/OpenBadge";
import { DemoBadge } from "@/components/market/DemoBadge";
import { directionsLink, fetchShop, fetchShopProducts, formatSyp, formatUsd, hoursLabel, intlPhone } from "@/lib/market";

export const Route = createFileRoute("/shop/$shopId")({
  head: () => ({
    meta: [
      { title: "تفاصيل الدكان — سوق قرية أبو جرين" },
      { name: "description", content: "منتجات الدكان وأسعارها بالليرة والدولار، الهاتف، أوقات الدوام والموقع." },
      { property: "og:title", content: "دكان في سوق قرية أبو جرين" },
      { property: "og:description", content: "منتجات وأسعار الدكان والاستلام من الدكان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { shopId } = Route.useParams();
  const shop = useQuery({ queryKey: ["shop", shopId], queryFn: () => fetchShop(shopId) });
  const products = useQuery({ queryKey: ["shop-products", shopId], queryFn: () => fetchShopProducts(shopId) });
  const s = shop.data;
  if (shop.isLoading) return <p className="p-6 text-center text-xl text-muted-foreground">جارِ التحميل...</p>;
  if (!s) return <p className="p-6 text-center text-xl text-muted-foreground">الدكان غير موجود</p>;
  return (
    <main className="space-y-4 px-4 pt-4">
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <h1 className="text-2xl font-extrabold">🏪 {s.name} <DemoBadge show={s.is_demo} /></h1>
        <p className="text-lg">👤 {s.owner_name}</p>
        <p className="text-lg text-muted-foreground">📍 {s.address}</p>
        <p className="text-lg" dir="ltr" style={{ textAlign: "right" }}>📞 {s.phone}</p>
        <p className="text-lg">🕒 الدوام: <span dir="ltr">{hoursLabel(s)}</span></p>
        <OpenBadge shop={s} />
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button asChild size="xl"><a href={`tel:+${intlPhone(s.phone)}`}><Phone /> اتصل بالدكان</a></Button>
          <Button asChild size="xl" variant="whatsapp">
            <a href={`https://wa.me/${intlPhone(s.phone)}`} target="_blank" rel="noopener"><MessageCircle /> واتساب</a>
          </Button>
        </div>
        <a href={directionsLink(s)} target="_blank" rel="noopener" className="flex items-center justify-center gap-1 text-lg font-bold text-primary">
          <Navigation className="size-5" /> الاتجاهات إلى الدكان
        </a>
      </section>
      <MapBox shops={[s]} height={200} />
      <h2 className="text-xl font-bold">المنتجات</h2>
      <ul className="space-y-2">
        {(products.data ?? []).map((p) => (
          <li key={p.id}>
            <Link to="/product/$productId" params={{ productId: p.id }} className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
              {p.photoSrc ? <img src={p.photoSrc} alt={p.name} className="size-16 rounded-xl object-cover" /> : <div className="flex size-16 items-center justify-center rounded-xl bg-secondary text-3xl">🧺</div>}
              <div className="flex-1">
                <p className="text-lg font-bold">{p.name} <DemoBadge show={s.is_demo} /></p>
                <p className="text-lg font-extrabold text-primary">{formatSyp(p.price_syp)} · <span className="text-muted-foreground">{formatUsd(p.price_usd)}</span> / {p.unit}</p>
                <p className={p.stock <= 0 ? "text-destructive" : "text-muted-foreground"}>{p.stock <= 0 ? "نفدت الكمية" : `متوفر: ${p.stock} ${p.unit}`}</p>
              </div>
            </Link>
          </li>
        ))}
        {products.data?.length === 0 && <p className="text-center text-muted-foreground">لا توجد منتجات بعد</p>}
      </ul>
      <p className="text-center text-sm text-muted-foreground">استلام من الدكان فقط · الدفع نقداً عند الاستلام</p>
    </main>
  );
}
