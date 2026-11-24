import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryByName, categoryDescription, cheapestId, isOpenAt, whatsappLink, type Offer } from "@/lib/market";
const shop = { id: "s", owner_id: null, name: "x", owner_name: "x", phone: "963944000001", address: "", lat: null, lng: null, open_time: "08:00", close_time: "20:00", status: "approved" as const };
const offer = (id: string, price: number, stock = 5): Offer => ({ id, shop_id: "s", name: "بطاطا", category: "خضار", unit: "كغ", price_syp: price, price_usd: 0, stock, photo_url: null, visible: true, shop });
describe("market rules", () => {
  it("shop is open inside working hours and closed outside", () => {
    expect(isOpenAt("08:00", "20:00", 9 * 60)).toBe(true);
    expect(isOpenAt("08:00", "20:00", 21 * 60)).toBe(false);
  });
  it("cheapest skips out-of-stock offers", () => {
    expect(cheapestId([offer("a", 7000, 0), offer("b", 8000), offer("c", 7500)])).toBe("c");
  });
  it("whatsapp message asks to reserve 2 kg for pickup", () => {
    expect(decodeURIComponent(whatsappLink("0944000001", "بطاطا", "كغ"))).toContain("أريد 2 كغ بطاطا");
    expect(whatsappLink("0944000001", "بطاطا", "كغ")).toMatch(/^https:\/\/wa\.me\/963944000001/);
  });
  it("new categories exist with descriptions", () => {
    const byName = new Map(CATEGORIES.map((c) => [c.name, c]));
    expect(byName.get("أدوات بناء")?.description).toBe("أدوات ومواد البناء، مثل الإسمنت والحديد والأدوات اليدوية");
    expect(byName.get("أدوات بناء")?.icon).toBe("🧱");
    expect(byName.get("أدوات منزلية")?.description).toBe("أدوات المطبخ والبيت والأواني والأدوات المنزلية");
    expect(byName.get("أخرى")?.description).toContain("لا ينتمي إلى التصنيفات السابقة");
    expect(byName.get("أخرى")).toBe(CATEGORIES[CATEGORIES.length - 1]);
    for (const c of CATEGORIES) expect(c.description.length).toBeGreaterThan(0);
    expect(categoryByName("أدوات بناء")?.icon).toBe("🧱");
    expect(categoryDescription("أدوات منزلية")).toContain("المطبخ");
    expect(categoryDescription("أخرى")).toContain("يكتب البائع وصف المنتج");
    expect(categoryByName("غير موجود")).toBeUndefined();
    expect(categoryDescription("غير موجود")).toBe("");
  });
});
