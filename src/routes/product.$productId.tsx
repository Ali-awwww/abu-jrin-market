import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { OfferCard } from "@/components/market/OfferCard";
import { useBuyerLocation } from "@/components/market/useLocation";
import { fetchProduct, shopDistance } from "@/lib/market";

export const Route = createFileRoute("/product/$productId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المنتج — سوق قرية أبو جرين" },
      { name: "description", content: "سعر المنتج بالليرة والدولار، الكمية المتوفرة والدكان الذي يبيعه." },
      { property: "og:title", content: "منتج في سوق قرية أبو جرين" },
      { property: "og:description", content: "السعر والكمية والدكان، واستلام من الدكان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { productId } = Route.useParams();
  const pos = useBuyerLocation();
  const q = useQuery({ queryKey: ["product", productId], queryFn: () => fetchProduct(productId) });
  if (q.isLoading) return <p className="p-6 text-center text-xl text-muted-foreground">جارِ التحميل...</p>;
  const o = q.data;
  if (!o) return <p className="p-6 text-center text-xl text-muted-foreground">المنتج غير موجود</p>;
  return (
    <main className="space-y-4 px-4 pt-4">
      {o.photoSrc && <img src={o.photoSrc} alt={o.name} className="h-56 w-full rounded-2xl object-cover" />}
      <p className="text-base text-muted-foreground">القسم: {o.category}</p>
      <OfferCard offer={o} distance={shopDistance(o.shop, pos)} />
      <Link to="/search" search={{ q: o.name, cat: undefined }} className="block rounded-2xl border-2 border-primary bg-card py-3 text-center text-lg font-bold text-primary">
        قارن سعر {o.name} في كل الدكاكين
      </Link>
    </main>
  );
}
