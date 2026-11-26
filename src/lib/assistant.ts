import { fetchOffers, formatSyp, formatUsd, whatsappLink, intlPhone, type Offer } from "./market";

export function parseAssistantQuery(text: string): { product?: string; shop?: string } {
  if (!text) return {};
  let clean = text.trim();
  const fillers = [
    "لو سمحت", "من فضلك", "شوفلي", "شوف لي", "هل", "بدي", "اريد", "أريد",
    "فيه", "في", "تفضل", "ممكن"
  ];
  for (const f of fillers) {
    clean = clean.replace(new RegExp(f, "g"), " ").trim();
  }
  clean = clean.replace(/\s+/g, " ");

  const sepRegex = /\s+(عندو|عندها|عندك|عند)\s+/;
  if (sepRegex.test(clean)) {
    const parts = clean.split(sepRegex);
    const shopRaw = parts[0]?.trim() || "";
    const productRaw = parts.slice(2).join(" ").trim();
    const cleanShop = shopRaw.replace(/^(دكان|محل|سوبرماركت|بقالية)\s*/, "").trim();
    const cleanProduct = productRaw.replace(/^(عندو|عندها|عندك|عند|فيه|في|بدي|اريد|أريد)\s*/, "").trim();
    return {
      shop: cleanShop || undefined,
      product: cleanProduct || undefined,
    };
  }

  const productRaw = clean.replace(/^(عن|في|عند|بدي|اريد|أريد)\s*/, "").trim();
  return {
    product: productRaw || undefined,
  };
}

export async function answerAssistantQuery(text: string): Promise<{ text: string; offers: Offer[] }> {
  const parsed = parseAssistantQuery(text);
  let allOffers: Offer[] = [];
  try {
    allOffers = await fetchOffers({});
  } catch (err) {
    console.error("Assistant fetch error:", err);
    return {
      text: "عذراً، حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى المحاولة مرة أخرى.",
      offers: [],
    };
  }

  if (!allOffers || allOffers.length === 0) {
    return {
      text: "عذراً، قاعدة البيانات فارغة حالياً ولا توجد منتجات مسجلة.",
      offers: [],
    };
  }

  let filtered = allOffers;

  if (parsed.shop) {
    const sQuery = parsed.shop.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        o.shop.name.toLowerCase().includes(sQuery) ||
        o.shop.owner_name.toLowerCase().includes(sQuery)
    );
  }

  if (parsed.product) {
    const pQuery = parsed.product.toLowerCase();
    filtered = filtered.filter((o) => o.name.toLowerCase().includes(pQuery));
  }

  if (filtered.length === 0 && (parsed.product || parsed.shop)) {
    const rawQuery = text.toLowerCase();
    filtered = allOffers.filter(
      (o) =>
        o.name.toLowerCase().includes(rawQuery) ||
        o.shop.name.toLowerCase().includes(rawQuery) ||
        o.shop.owner_name.toLowerCase().includes(rawQuery) ||
        o.category.toLowerCase().includes(rawQuery)
    );
  }

  if (filtered.length === 0) {
    return {
      text: `عذراً، لم يتم العثور على منتجات مطابقة لطلبك "${text}" حالياً في دكاكين القرية.`,
      offers: [],
    };
  }

  filtered.sort((a, b) => a.price_syp - b.price_syp);
  const topOffers = filtered.slice(0, 5);

  const cheapest = topOffers[0];
  let summaryText = `وجدت ${topOffers.length} نتيجة مطابقة لطلبك.`;
  if (cheapest) {
    summaryText = `وجدت ${topOffers.length} نتيجة. أرخص سعر لـ (${cheapest.name}) عند دكان (${cheapest.shop.name}) بسعر ${formatSyp(cheapest.price_syp)} (${formatUsd(cheapest.price_usd)}).`;
  }

  return {
    text: summaryText,
    offers: topOffers,
  };
}
