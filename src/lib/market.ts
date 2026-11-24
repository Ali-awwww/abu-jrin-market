import { supabase } from "@/integrations/supabase/client";

export const VILLAGE_CENTER: [number, number] = [36.0475, 37.4508];
export const VILLAGE_BOUNDS: [[number, number], [number, number]] = [
  [36.0395, 37.4398],
  [36.0555, 37.4618],
];
export const CATEGORIES = [
  { name: "خضار", icon: "🥔" },
  { name: "فواكه", icon: "🍎" },
  { name: "بقالة", icon: "🛒" },
  { name: "خبز", icon: "🍞" },
  { name: "لحوم", icon: "🍖" },
  { name: "ألبان وأجبان", icon: "🧀" },
  { name: "بيض", icon: "🥚" },
  { name: "عسل وزيت زيتون", icon: "🍯" },
  { name: "منظفات", icon: "🧼" },
  { name: "أعلاف ودواجن", icon: "🐔" },
  { name: "أدوات منزلية", icon: "🍳" },
  { name: "أخرى", icon: "📦" },
] as const;
export const UNITS = ["كغ", "قطعة", "ربطة", "لتر", "علبة", "كيس"];

export type Shop = {
  id: string;
  owner_id: string | null;
  name: string;
  owner_name: string;
  phone: string;
  address: string;
  lat: number | null;
  lng: number | null;
  open_time: string;
  close_time: string;
  status: "pending" | "approved";
  is_demo?: boolean;
};
export type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  unit: string;
  price_syp: number;
  price_usd: number;
  stock: number;
  photo_url: string | null;
  visible: boolean;
};
export type Offer = Product & { shop: Shop };

/** Minutes since midnight in the village's time zone. */
export function villageMinutesNow(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Damascus",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}
function toMin(t: string): number {
  const [h = "0", m = "0"] = t.split(":");
  return Number(h) * 60 + Number(m);
}
export function isOpenAt(open: string, close: string, minutes: number): boolean {
  const o = toMin(open);
  const c = toMin(close);
  if (o === c) return true;
  return o < c ? minutes >= o && minutes < c : minutes >= o || minutes < c;
}
export function isShopOpen(s: Pick<Shop, "open_time" | "close_time">, now?: Date) {
  return isOpenAt(s.open_time, s.close_time, villageMinutesNow(now));
}
export function hoursLabel(s: Pick<Shop, "open_time" | "close_time">) {
  return `${s.open_time.slice(0, 5)} - ${s.close_time.slice(0, 5)}`;
}

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function shopDistance(s: Shop, from: [number, number]): number | null {
  if (s.lat == null || s.lng == null) return null;
  return distanceKm(from, [s.lat, s.lng]);
}
export function formatDistance(km: number | null) {
  if (km == null) return "";
  return km < 1 ? `${Math.round(km * 1000)} متر` : `${km.toFixed(1)} كم`;
}

export function sortOffers(offers: Offer[], by: "price" | "distance", from: [number, number]) {
  const copy = [...offers];
  if (by === "price") copy.sort((a, b) => a.price_syp - b.price_syp);
  else copy.sort((a, b) => (shopDistance(a.shop, from) ?? 999) - (shopDistance(b.shop, from) ?? 999));
  return copy;
}
export function cheapestId(offers: Offer[]) {
  const inStock = offers.filter((o) => o.stock > 0);
  const list = inStock.length ? inStock : offers;
  return list.reduce<Offer | null>((m, o) => (!m || o.price_syp < m.price_syp ? o : m), null)?.id;
}
export function nearestId(offers: Offer[], from: [number, number]) {
  let best: { id: string; d: number } | null = null;
  for (const o of offers) {
    const d = shopDistance(o.shop, from);
    if (d != null && (!best || d < best.d)) best = { id: o.id, d };
  }
  return best?.id;
}

export const formatSyp = (n: number) => `${Math.round(n).toLocaleString("ar-SY")} ل.س`;
export const formatUsd = (n: number) => `$${Number(n).toFixed(2)}`;

export function intlPhone(phone: string) {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "963" + d.slice(1);
  return d;
}
export function whatsappLink(phone: string, product: string, unit: string, qty = 2) {
  const msg = `مرحباً، أريد ${qty} ${unit} ${product}، سآتي بعد قليل لأستلمها وأدفع نقداً.`;
  return `https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(msg)}`;
}
export function directionsLink(s: Shop) {
  return s.lat != null && s.lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + " أبو جرين")}`;
}
export function phoneToEmail(phone: string) {
  return `${intlPhone(phone)}@abujrin.app`;
}

export async function withPhotoUrls<T extends { photo_url: string | null }>(items: T[]) {
  const paths = items.map((i) => i.photo_url).filter((p): p is string => !!p);
  if (!paths.length) return items.map((i) => ({ ...i, photoSrc: null as string | null }));
  const { data } = await supabase.storage.from("product-photos").createSignedUrls(paths, 3600);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((i) => ({ ...i, photoSrc: (i.photo_url && map.get(i.photo_url)) || null }));
}

export async function fetchOffers(filter: { q?: string | undefined; category?: string | undefined }) {
  let query = supabase.from("products").select("*, shop:shops!inner(*)").eq("visible", true);
  if (filter.q) query = query.ilike("name", `%${filter.q.trim()}%`);
  if (filter.category) query = query.eq("category", filter.category);
  const { data, error } = await query;
  if (error) throw error;
  return withPhotoUrls(data as unknown as Offer[]);
}
export async function fetchShops() {
  const { data, error } = await supabase.from("shops").select("*").eq("status", "approved").order("name");
  if (error) throw error;
  return data as Shop[];
}

export async function fetchShop(id: string) {
  const { data, error } = await supabase.from("shops").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Shop | null;
}
export async function fetchShopProducts(shopId: string) {
  const { data, error } = await supabase.from("products").select("*").eq("shop_id", shopId).eq("visible", true).order("name");
  if (error) throw error;
  return withPhotoUrls(data as Product[]);
}
export async function fetchProduct(id: string) {
  const { data, error } = await supabase.from("products").select("*, shop:shops!inner(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [o] = await withPhotoUrls([data as unknown as Offer]);
  return o ?? null;
}
