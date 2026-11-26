import { describe, it, expect } from "vitest";
import { parseAssistantQuery } from "./assistant";

describe("parseAssistantQuery", () => {
  it("parses simple product query", () => {
    const res = parseAssistantQuery("شوفلي بطاطا");
    expect(res.product).toBe("بطاطا");
    expect(res.shop).toBeUndefined();
  });

  it("parses shop and product query", () => {
    const res = parseAssistantQuery("شوفلي أبو أحمد عندو بطاطا");
    expect(res.shop).toBe("أبو أحمد");
    expect(res.product).toBe("بطاطا");
  });
});
