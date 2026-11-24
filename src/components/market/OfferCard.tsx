import { Phone, MessageCircle, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpenBadge } from "./OpenBadge";
import {
  directionsLink, formatDistance, formatSyp, formatUsd, whatsappLink, type Offer,
} from "@/lib/market";

export function OfferCard({
  offer, cheapest, nearest, distance,
}: { offer: Offer & { photoSrc?: string | null }; cheapest?: boolean; nearest?: boolean; distance: number | null }) {
  const s = offer.shop;
  const out = offer.stock <= 0;
  return (
    <article
      className={`rounded-2xl border-2 bg-card p-4 shadow-soft ${cheapest ? "border-accent" : nearest ? "border-primary" : "border-border"}`}
    >
      <div className="mb-2 flex flex-wrap gap-2">
        {cheapest && <span className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">💰 الأرخص</span>}
        {nearest && <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">📍 الأقرب</span>}
      </div>
      <div className="flex gap-3">
        {offer.photoSrc ? (
          <img src={offer.photoSrc} alt={offer.name} className="size-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-secondary text-4xl">🧺</div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold">{offer.name}</h3>
          <p className="text-2xl font-extrabold text-primary">{formatSyp(offer.price_syp)}</p>
          <p className="text-lg font-semibold text-muted-foreground">{formatUsd(offer.price_usd)} <span className="text-base">/ {offer.unit}</span></p>
          <p className={`text-base font-medium ${out ? "text-destructive" : ""}`}>
            {out ? "نفدت الكمية" : `متوفر: ${offer.stock} ${offer.unit}`}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1 border-t border-border pt-3">
        <p className="text-lg font-bold">🏪 {s.name}</p>
        <p className="flex items-center gap-1 text-base text-muted-foreground">
          <MapPin className="size-4" /> {s.address} {distance != null && `· ${formatDistance(distance)}`}
        </p>
        <p className="text-base text-muted-foreground" dir="ltr" style={{ textAlign: "right" }}>📞 {s.phone}</p>
        <OpenBadge shop={s} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button asChild size="xl">
          <a href={`tel:+${s.phone.replace(/\D/g, "")}`}><Phone /> اتصل بالدكان</a>
        </Button>
        <Button asChild size="xl" variant="whatsapp">
          <a href={whatsappLink(s.phone, offer.name, offer.unit)} target="_blank" rel="noopener">
            <MessageCircle /> احجز عبر واتساب
          </a>
        </Button>
      </div>
      <a href={directionsLink(s)} target="_blank" rel="noopener" className="mt-2 flex items-center justify-center gap-1 text-base font-medium text-primary">
        <Navigation className="size-4" /> الاتجاهات إلى الدكان
      </a>
      <p className="mt-1 text-center text-sm text-muted-foreground">استلام من الدكان فقط · الدفع نقداً عند الاستلام</p>
    </article>
  );
}
