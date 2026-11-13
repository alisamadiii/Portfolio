import { describe, expect, it } from "vitest";

import { darken, EVENT_COLORS } from "@/components/calendar/event-colors";

describe("event colors", () => {
  it("darken keeps the hue and scales every channel", () => {
    expect(darken("#ffffff", 0.5)).toBe("rgb(128, 128, 128)");
    expect(darken("#039be5", 0.45)).toBe("rgb(2, 85, 126)");
  });

  it("the palette is valid 6-digit hex (the week view only tints hex colors)", () => {
    for (const c of EVENT_COLORS) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
