import { supabase } from "@/integrations/supabase/client";
import { fetchOffers, type Offer } from "./market";

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
    const before = parts[0]?.trim() || "";
    const after = parts.slice(2).join(" ").trim();

    const questionWords = ["شو", "ما", "وين", "هل", "فيه", "في"];
    if (!before || questionWords.includes(before)) {
      const cleanShop = after.replace(/^(دكان|محل|سوبرماركت|بقالية)\s*/, "").trim();
      return { shop: cleanShop || undefined };
    }

    const cleanShop = before.replace(/^(دكان|محل|سوبرماركت|بقالية)\s*/, "").trim();
    const cleanProduct = after.replace(/^(عندو|عندها|عندك|عند|فيه|في|بدي|اريد|أريد)\s*/, "").trim();
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

export async function askAssistant(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<{ reply: string; offers: Offer[] }> {
  let allOffers: Offer[] = [];
  try {
    allOffers = await fetchOffers({});
  } catch (err) {
    console.error("Assistant fetch offers error:", err);
  }

  let context = "قاعدة البيانات فارغة ولا توجد منتجات مسجلة حالياً.";
  if (allOffers && allOffers.length > 0) {
    context = allOffers
      .map(
        (o) =>
          `المنتج: ${o.name} | الفئة: ${o.category} | السعر: ${o.price_syp} ل.س (${o.price_usd} $) | المخزون: ${o.stock} ${o.unit} | الدكان: ${o.shop.name} (صاحب الدكان: ${o.shop.owner_name}) | العنوان: ${o.shop.address} | الهاتف: ${o.shop.phone}`
      )
      .join("\n");
  }

  try {
    const { data, error } = await supabase.functions.invoke("chat-assistant", {
      body: { message, history, context },
    });

    if (error || !data || !data.reply) {
      throw error || new Error("Invalid response from assistant function");
    }

    const parsed = parseAssistantQuery(message);
    let matchedOffers = allOffers;
    if (parsed.shop) {
      const sQuery = parsed.shop.toLowerCase();
      matchedOffers = matchedOffers.filter(
        (o) =>
          o.shop.name.toLowerCase().includes(sQuery) ||
          o.shop.owner_name.toLowerCase().includes(sQuery)
      );
    }
    if (parsed.product) {
      const pQuery = parsed.product.toLowerCase();
      matchedOffers = matchedOffers.filter((o) => o.name.toLowerCase().includes(pQuery));
    }
    if (!parsed.shop && !parsed.product && message.length > 2) {
      const q = message.toLowerCase();
      matchedOffers = matchedOffers.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.shop.name.toLowerCase().includes(q) ||
          o.shop.owner_name.toLowerCase().includes(q)
      );
    }
    matchedOffers.sort((a, b) => a.price_syp - b.price_syp);

    return {
      reply: data.reply,
      offers: matchedOffers.slice(0, 5),
    };
  } catch (err) {
    console.error("askAssistant error:", err);
    return {
      reply: "تعذّر الوصول إلى المساعد الآن، حاول لاحقاً",
      offers: [],
    };
  }
}
