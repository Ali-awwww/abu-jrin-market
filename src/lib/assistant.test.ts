import { describe, it, expect } from "vitest";
import { parseAssistantQuery } from "./assistant";

describe("parseAssistantQuery", () => {
  it("parses simple product query", () => {
    const res = parseAssistantQuery("شوفلي بطاطا");
    expect(res.product).toBe("بطاطا");
    expect(res.shop).toBeUndefined();
  });

  it("parses shop query", () => {
    const res = parseAssistantQuery("شو عند دكان أبو أحمد");
    expect(res.shop).toBe("أبو أحمد");
  });
});
