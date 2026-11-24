import { Phone, MessageCircle, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { OpenBadge } from "./OpenBadge";
import { DemoBadge } from "./DemoBadge";
import {
  directionsLink,
  formatDistance,
  formatSyp,
  formatUsd,
  whatsappLink,
  type Offer,
} from "@/lib/market";
export function OfferCard({
  offer,
  cheapest,
  nearest,
  distance,
}: {
  offer: Offer & { photoSrc?: string | null };
  cheapest?: boolean;
  nearest?: boolean;
  distance: number | null;
}) {
  const s = offer.shop;
  const out = offer.stock <= 0;
  return (
    <article
      className={`rounded-2xl border-2 bg-card p-4 shadow-soft ${cheapest ? "border-accent" : nearest ? "border-primary" : "border-border"}`}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {cheapest && <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">🏷️ الأرخص</span>}
        {nearest && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">📍 الأقرب</span>}
      </div>
      <div className="flex gap-3">
        {offer.photoSrc ? (
          <img src={offer.photoSrc} alt={offer.name} className="size-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-secondary text-4xl">🧺</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold"><Link to="/product/$productId" params={{ productId: offer.id }} className="underline-offset-4 hover:underline">{offer.name}</Link></h3>
          {offer.description ? <p className="text-base text-muted-foreground">{offer.description}</p> : null}
          <p className="text-2xl font-extrabold text-primary">{formatSyp(offer.price_syp)}</p>
          <p className="text-lg font-semibold text-muted-foreground">{formatUsd(offer.price_usd)}<span className="text-base"> / {offer.unit}</span></p>
          <p className={`text-base font-medium ${out ? "text-destructive" : ""}`}>
            {out ? "نفدت الكمية" : `متوفر: ${offer.stock} ${offer.unit}`}
          </p>
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-base">
        <span className="font-bold">🏪 {s.name}</span>
        <DemoBadge show={s.is_demo} />
        <OpenBadge shop={s} />
        <span className="text-muted-foreground">· {s.address}</span>
        {distance != null && <span className="text-muted-foreground">· {formatDistance(distance)}</span>}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button asChild className="h-14 text-lg font-bold">
          <a href={whatsappLink(s.phone, offer.name, offer.unit)} target="_blank" rel="noreferrer">
            <MessageCircle className="size-5" /> واتساب
          </a>
        </Button>
        <Button asChild variant="secondary" className="h-14 text-lg font-bold">
          <a href={`tel:${s.phone}`}>
            <Phone className="size-5" /> اتصال
          </a>
        </Button>
        <Button asChild variant="outline" className="h-14 text-lg font-bold">
          <a href={directionsLink(s)} target="_blank" rel="noreferrer">
            <Navigation className="size-5" /> الاتجاهات
          </a>
        </Button>
      </div>
      <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
        <MapPin className="size-4" /> استلم من الدكان وادفع نقداً — التوصيل غير متاح حالياً
      </p>
    </article>
  );
}
