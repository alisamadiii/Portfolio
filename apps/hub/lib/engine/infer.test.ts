import { describe, expect, it } from "vitest";

import { inferFields } from "./infer";

/** Pull the inferred field for a single top-level key out of a value object. */
const infer = (key: string, value: unknown) =>
  inferFields({ [key]: value }).find((f) => f.name === key);

describe("inferScalar image detection", () => {
  it("tags an empty image-keyed field as image (new/blank entry gets a picker)", () => {
    expect(infer("image", "")?.type).toBe("image");
    expect(infer("photo", "")?.type).toBe("image");
    expect(infer("icon", "")?.type).toBe("image");
  });

  it("leaves an empty non-image key as a plain string", () => {
    expect(infer("photoHint", "")?.type).toBe("string");
    expect(infer("name", "")?.type).toBe("string");
    expect(infer("cat", "")?.type).toBe("string");
  });

  it("keeps populated non-path text under an image-suffix key as string", () => {
    // A real value that isn't a path carries a counter-signal — the relax only
    // applies to empty values.
    expect(infer("icon", "star")?.type).toBe("string");
  });

  it("still tags a root-relative image path as image", () => {
    expect(infer("photo", "/a.jpg")?.type).toBe("image");
  });

  it("still tags a value with an image extension as image regardless of key", () => {
    expect(infer("cover", "https://cdn.example.com/x.webp")?.type).toBe("image");
  });
});
