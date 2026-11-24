import { supabase } from "@/integrations/supabase/client";
// Abu Jrin near Al-Safira, Aleppo (not Manbij).
export const VILLAGE_CENTER: [number, number] = [36.0475, 37.4508];
export const VILLAGE_BOUNDS: [[number, number], [number, number]] = [
  [36.0395, 37.4398],
  [36.0555, 37.4618],
];
export const CATEGORIES = [
  { name: "خضار", icon: "🥔", description: "خضار طازجة من دكاكين القرية" },
  { name: "فواكه", icon: "🍎", description: "فواكه طازجة وموسمية" },
  { name: "بقالة", icon: "🛒", description: "مواد البقالة والتموين اليومي" },
  { name: "خبز", icon: "🍞", description: "خبز طازج ومعجنات" },
  { name: "لحوم", icon: "🍖", description: "لحوم طازجة من دكاكين القرية" },
  { name: "ألبان وأجبان", icon: "🧀", description: "ألبان وأجبان طازجة" },
  { name: "بيض", icon: "🥚", description: "بيض طازج" },
  { name: "عسل وزيت زيتون", icon: "🍯", description: "عسل وزيت زيتون من إنتاج القرية" },
  { name: "منظفات", icon: "🧼", description: "منظفات ومواد تنظيف للبيت" },
  { name: "أعلاف ودواجن", icon: "🐔", description: "أعلاف ودواجن" },
  { name: "أدوات بناء", icon: "🧱", description: "أدوات ومواد البناء، مثل الإسمنت والحديد والأدوات اليدوية" },
  { name: "أدوات منزلية", icon: "🍳", description: "أدوات المطبخ والبيت والأواني والأدوات المنزلية" },
  { name: "أخرى", icon: "📦", description: "أي منتج آخر من منتجات القرية لا ينتمي إلى التصنيفات السابقة، ويكتب البائع وصف المنتج عند إضافته" },
] as const;

/** التصنيف بالاسم، أو undefined إن لم يكن موجوداً. */
export function categoryByName(name: string | undefined | null) {
  if (!name) return undefined;
  return CATEGORIES.find((c) => c.name === name);
}

/** وصف التصنيف بالاسم، أو سلسلة فارغة إن لم يكن له وصف. */
export function categoryDescription(name: string | undefined | null) {
  return categoryByName(name)?.description ?? "";
}

// تذكير تجديد صورة المنتج: اختياري تماماً، يظهر للبائع فقط.
// لا يوجد في قاعدة البيانات عمود منفصل لوقت الصورة، لذلك يُستخدم آخر تحديث للمنتج (updated_at)
// مقياساً لعمر الصورة، لأنه يُحدَّث عند كل حفظ للمنتج بما فيه تغيير الصورة.
export const PHOTO_REMINDER_HOURS = 5;
export const PHOTO_REMINDER_SNOOZE_HOURS = 5;

const PHOTO_REMINDER_SNOOZE_KEY = "abu-jrin-photo-reminder-snooze";

/** عمر آخر تحديث للمنتج بالساعات، أو null إن لم يكن معروفاً. */
export function photoAgeHours(updatedAt: string | undefined | null, now: number = Date.now()): number | null {
  if (!updatedAt) return null;
  const t = new Date(updatedAt).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / 36e5;
}

/** هل مرّت 5 ساعات على آخر تحديث للمنتج؟ */
export function isPhotoReminderDue(updatedAt: string | undefined | null, now: number = Date.now()): boolean {
  const age = photoAgeHours(updatedAt, now);
  return age != null && age >= PHOTO_REMINDER_HOURS;
}

function readPhotoReminderSnoozes(): Record<string, number> {
  try {
    if (typeof localStorage === "undefined") return {};
    return (JSON.parse(localStorage.getItem(PHOTO_REMINDER_SNOOZE_KEY) ?? "{}") ?? {}) as Record<string, number>;
  } catch {
    return {};
  }
}

/** هل أجّل البائع التذكير لهذا المنتج وما زال التأجيل سارياً؟ */
export function isPhotoReminderSnoozed(productId: string, now: number = Date.now()): boolean {
  const until = readPhotoReminderSnoozes()[productId];
  return typeof until === "number" && until > now;
}

/** أجّل التذكير لهذا المنتج 5 ساعات أخرى. لا يمنع البيع ولا يحذف المنتج. */
export function snoozePhotoReminder(productId: string, now: number = Date.now()): void {
  try {
    if (typeof localStorage === "undefined") return;
    const all = readPhotoReminderSnoozes();
    all[productId] = now + PHOTO_REMINDER_SNOOZE_HOURS * 36e5;
    localStorage.setItem(PHOTO_REMINDER_SNOOZE_KEY, JSON.stringify(all));
  } catch {
    // إن تعذّر التخزين المحلي يبقى التذكير ظاهراً دون أي عقوبة.
  }
}

/** هل يجب إظهار تذكير تجديد الصورة لهذا المنتج الآن؟ (للبائع فقط، وللمنتجات التي لها صورة). */
export function shouldShowPhotoReminder(
  product: { id: string; updated_at?: string | null; photo_url?: string | null },
  now: number = Date.now(),
): boolean {
  if (!product.photo_url) return false;
  return isPhotoReminderDue(product.updated_at, now) && !isPhotoReminderSnoozed(product.id, now);
}

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
  status: "pending" | "approved" | "rejected";
  is_demo?: boolean;
};
export type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  description?: string | null;
  unit: string;
  price_syp: number;
  price_usd: number;
  stock: number;
  photo_url: string | null;
  visible: boolean;
  // يأتي من Supabase (select *) ويُحدَّث عند كل حفظ للمنتج، ويُستخدم لعمر الصورة في تذكير التجديد.
  updated_at?: string;
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
