import { describe, expect, it } from "vitest";

import {
  cleanReviewText,
  isFeedReview,
  isShortGoogleLink,
  parseReviewsTarget,
  pickReviews,
  placeInfo,
  toSavedReview,
  writeReviewUrl,
  type ApifyReviewItem,
} from "@workspace/trpc/lib/google-reviews-shared";

const item = (n: number, over: Partial<ApifyReviewItem> = {}): ApifyReviewItem => ({
  reviewId: `r${n}`,
  name: `Person ${n}`,
  stars: 5,
  text: `Great job ${n}`,
  // Higher n = newer.
  publishedAtDate: new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString(),
  ...over,
});

// DELIBERATE CHANGE (2026-11-17, same day): Ali dropped the "first sync keeps
// the 20 newest 5-star" rule. Every scraped review (any rating, rating-only
// too) is saved; the public feed picks 5 stars with text (isFeedReview). The
// old 20-cap, skip-1-4-stars and skip-empty-text assertions were replaced.
describe("pickReviews", () => {
  it("saves every scraped review, newest first, no cap", () => {
    const items = Array.from({ length: 100 }, (_, i) => item(i, { stars: (i % 5) + 1 }));
    const picked = pickReviews(items);
    expect(picked).toHaveLength(100);
    expect(picked[0]!.reviewId).toBe("r99");
  });

  it("keeps 1-4 star and rating-only reviews (text null)", () => {
    const picked = pickReviews([item(1, { stars: 2 }), item(2, { text: "  " }), item(3, { text: null })]);
    expect(picked.map((r) => r.reviewId)).toEqual(["r3", "r2", "r1"]);
    expect(picked[0]!.text).toBeNull();
    expect(picked[1]!.text).toBeNull();
  });

  it("dedupes the same review id inside one scrape", () => {
    expect(pickReviews([item(1), item(1)])).toHaveLength(1);
  });
});

describe("isFeedReview", () => {
  const r = (over: Partial<{ rating: number; text: string | null; hidden: boolean }>) => ({
    rating: 5,
    text: "Great",
    hidden: false,
    ...over,
  });
  it("only 5 stars with text, not hidden, go to the website", () => {
    expect(isFeedReview(r({}))).toBe(true);
    expect(isFeedReview(r({ rating: 4 }))).toBe(false);
    expect(isFeedReview(r({ text: null }))).toBe(false);
    expect(isFeedReview(r({ text: "   " }))).toBe(false);
    expect(isFeedReview(r({ hidden: true }))).toBe(false);
  });
});

describe("toSavedReview", () => {
  it("maps the Apify fields and the owner reply", () => {
    const r = toSavedReview(
      item(1, {
        reviewerPhotoUrl: "https://lh3.googleusercontent.com/x",
        responseFromOwnerText: " Thanks! ",
        responseFromOwnerDate: "2026-02-01T00:00:00.000Z",
        reviewUrl: "https://www.google.com/maps/reviews/x",
      })
    )!;
    expect(r.authorName).toBe("Person 1");
    expect(r.ownerReply).toBe("Thanks!");
    expect(r.ownerReplyAt?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(r.authorPhotoUrl).toBe("https://lh3.googleusercontent.com/x");
  });

  it("drops items without an id or a valid date", () => {
    expect(toSavedReview(item(1, { reviewId: null }))).toBeNull();
    expect(toSavedReview(item(1, { publishedAtDate: "not a date" }))).toBeNull();
  });

  it("falls back to 'Google user' when the name is missing", () => {
    expect(toSavedReview(item(1, { name: null }))!.authorName).toBe("Google user");
  });
});

// Regression (2026-11-17, Jax Auto Lab test page): Google sends line breaks as
// <br> tags; the website showed a literal "<br><br>" in the review.
describe("cleanReviewText", () => {
  it("turns <br> into newlines and drops other tags", () => {
    expect(cleanReviewText("Great job.<br><br>Bringing all the family cars!")).toBe(
      "Great job.\n\nBringing all the family cars!"
    );
    expect(cleanReviewText("a<br/>b<BR />c")).toBe("a\nb\nc");
    expect(cleanReviewText("<b>Bold</b> move")).toBe("Bold move");
    expect(cleanReviewText("<br><br>")).toBeNull();
    expect(cleanReviewText(null)).toBeNull();
  });

  it("is applied when mapping Apify items", () => {
    expect(toSavedReview(item(1, { text: "One<br>Two" }))!.text).toBe("One\nTwo");
  });
});

describe("parseReviewsTarget", () => {
  it("accepts a bare place id", () => {
    expect(parseReviewsTarget("ChIJT5scynmXKyIRlwFotSc8Yqc")).toEqual({
      placeId: "ChIJT5scynmXKyIRlwFotSc8Yqc",
    });
  });

  it("turns a resolved share.google review link into a cid place URL", () => {
    const resolved =
      "https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1sCi9DQUlRQUNvZENodHljRjlvT25OMmNUVklWVTFCY3poRU9VSmxjbVpPVjBSZlRVRRAB!2m1!1s0x0:0xa7623c27b5680197!3m1!1s2@1?hl=en";
    expect(parseReviewsTarget(resolved)).toEqual({
      url: "https://www.google.com/maps?cid=12061268893296492951",
    });
  });

  it("keeps a /maps/place/ URL without its tracking query", () => {
    expect(
      parseReviewsTarget("https://www.google.com/maps/place/Jax+Auto+Lab/@30.2,-81.5,17z?entry=ttu")
    ).toEqual({ url: "https://www.google.com/maps/place/Jax+Auto+Lab/@30.2,-81.5,17z" });
  });

  it("reads ?cid= and place_id links", () => {
    expect(parseReviewsTarget("https://maps.google.com/?cid=123")).toEqual({
      url: "https://www.google.com/maps?cid=123",
    });
    expect(
      parseReviewsTarget("https://www.google.com/maps/search/?api=1&query=x&query_place_id=ChIJT5scynmXKyIRlwFotSc8Yqc")
    ).toEqual({ placeId: "ChIJT5scynmXKyIRlwFotSc8Yqc" });
  });

  // Regression (2026-11-17, Jax Auto Lab): a maps.app.goo.gl link resolved to a
  // place URL whose data path has !5s0x…:0x… (the plaza) BEFORE the place's
  // own !1s0x…:0x…. Taking the first feature id scraped the plaza: 0 reviews.
  it("uses the place's own !1s feature id, never the !5s one", () => {
    const resolved =
      "https://www.google.com/maps/place/Jax+Auto+Lab+%26+Repair+Shop/@30.3058944,-81.564526,17z/data=!3m2!4b1!5s0x88e5b454725e1a97:0x5a3aab9f8e77d4b1!4m6!3m5!1s0x88e5b5956e5631d1:0xbc3ef4c9d93e7e53!8m2!3d30.3058944!4d-81.564526!16s%2Fg%2F11xkp8m8n6!18m1!1e1?entry=tts";
    expect(parseReviewsTarget(resolved)).toEqual({
      url: "https://www.google.com/maps?cid=13564548275456867923",
    });
  });

  it("rejects non-Google and non-place links", () => {
    expect(parseReviewsTarget("https://yelp.com/biz/x")).toBeNull();
    expect(parseReviewsTarget("https://www.google.com/search?q=pizza")).toBeNull();
    expect(parseReviewsTarget("not a url")).toBeNull();
  });
});

describe("helpers", () => {
  it("recognizes short links that need resolving", () => {
    expect(isShortGoogleLink("https://share.google/gZJG37PvxXQ9CfHvA")).toBe(true);
    expect(isShortGoogleLink("https://maps.app.goo.gl/abc")).toBe(true);
    expect(isShortGoogleLink("https://www.google.com/maps/place/x")).toBe(false);
  });

  it("builds the write-a-review link", () => {
    expect(writeReviewUrl("ChIJabc")).toBe(
      "https://search.google.com/local/writereview?placeid=ChIJabc"
    );
  });

  it("placeInfo takes listing fields from the first item that has them", () => {
    expect(
      placeInfo([item(1), item(2, { placeId: "ChIJx", title: "Shop", totalScore: 4.9, reviewsCount: 263 })])
    ).toEqual({ placeId: "ChIJx", businessName: "Shop", address: null, rating: 4.9, totalReviews: 263 });
    expect(placeInfo([])).toEqual({
      placeId: null,
      businessName: null,
      address: null,
      rating: null,
      totalReviews: null,
    });
  });

  // The sync fills Settings' address from the listing when the owner left it empty.
  it("placeInfo picks up the listing address", () => {
    expect(placeInfo([item(1, { address: "1 Main St, Orlando, FL" })]).address).toBe("1 Main St, Orlando, FL");
  });
});
