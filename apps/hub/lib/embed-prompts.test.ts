import { describe, expect, it } from "vitest";

import { leadsPrompt, reviewsPrompt } from "@/lib/embed-prompts";

const args = { apiUrl: "https://api.example.test", projectId: "3f2a1b4c-0000-4000-8000-123456789abc" };

// Every name below is read by apps/api/public/leads.js or reviews.js. If a
// prompt drops one, the AI installing the site will miss that feature.
const LEADS_CONTRACT = [
  'data-lead-form="Contact"',
  "full_name",
  "first_name + last_name",
  "email",
  "tel",
  "message",
  "_hp",
  "data-success",
  "data-redirect",
  "data-conversion",
  "send_to",
  "[data-lead-message]",
  "lead:beforesubmit",
  "lead:success",
  "lead:error",
  "event.detail = { status, message }",
  "preventDefault()",
];

const REVIEWS_CONTRACT = [
  "[data-reviews-rating]",
  "[data-reviews-count]",
  "[data-reviews-name]",
  "a[data-reviews-write]",
  "a[data-reviews-maps]",
  "<template data-review-template>",
  'data-review="stars"',
  'data-review="text"',
  'data-review="author"',
  'data-review="date"',
  'data-review="photo"',
  'data-review="reply"',
  'data-review="link"',
  "data-limit",
  "default 20, max 50",
  "window.hubReviews",
  "reviews:load",
  "reviews:render",
  "reviews:error",
  "astro:after-swap",
  "data-review-rendered",
];

describe("leadsPrompt", () => {
  const prompt = leadsPrompt(args);

  it("includes the exact script tag for the project", () => {
    expect(prompt).toContain(
      `<script src="${args.apiUrl}/leads.js" data-key="${args.projectId}" defer></script>`
    );
  });

  it("names every attribute and event leads.js reads", () => {
    for (const name of LEADS_CONTRACT) expect(prompt, name).toContain(name);
  });

  it("includes the example form verbatim", () => {
    expect(prompt).toContain('<input name="_hp" type="text" style="display:none" tabindex="-1" autocomplete="off" />');
    expect(prompt).toContain('<textarea name="message" placeholder="How can we help?"></textarea>');
  });

  it("tells the AI the rules and what to report back", () => {
    expect(prompt).toContain("Do not call the API endpoint directly");
    expect(prompt).toContain("allowed domains");
    expect(prompt).toContain("When you are done, tell me:");
  });

  it("has no em dash", () => {
    expect(prompt).not.toContain("—");
  });
});

describe("reviewsPrompt", () => {
  const prompt = reviewsPrompt(args);

  it("includes the exact script tag for the project", () => {
    expect(prompt).toContain(
      `<script src="${args.apiUrl}/reviews.js" data-key="${args.projectId}" defer></script>`
    );
  });

  it("names every attribute and event reviews.js reads", () => {
    for (const name of REVIEWS_CONTRACT) expect(prompt, name).toContain(name);
  });

  it("includes the example markup verbatim and the 5-star rule", () => {
    expect(prompt).toContain(
      '<figcaption><span data-review="author"></span>, <time data-review="date"></time></figcaption>'
    );
    expect(prompt).toContain("<a data-reviews-write>Leave us a review</a>");
    expect(prompt).toContain("Only 5-star reviews with written text are returned");
  });

  it("tells the AI the rules and what to report back", () => {
    expect(prompt).toContain("Do not call the API endpoint directly");
    expect(prompt).toContain("allowed domains");
    expect(prompt).toContain("When you are done, tell me:");
  });

  it("has no em dash", () => {
    expect(prompt).not.toContain("—");
  });

  // 2026-11-18: two client sites showed "Read all  264  on Google" because
  // their button was inline-flex with a gap, so the count span and the text
  // around it became three flex items. The script cannot fix that; the AI
  // has to wrap the whole label in one element.
  it("warns about flex gap buttons around a filled-in span", () => {
    expect(prompt).toContain("inline-flex with a gap");
    expect(prompt).toContain('<a class="btn"><span>Read all <span data-reviews-count></span> reviews on Google</span></a>');
  });
});

// The hub shows the prompt in a 6-line clamp; keep each one short enough to
// paste comfortably into a chat box.
describe("prompt length", () => {
  it("stays around 60 lines", () => {
    expect(leadsPrompt(args).split("\n").length).toBeLessThanOrEqual(65);
    expect(reviewsPrompt(args).split("\n").length).toBeLessThanOrEqual(65);
  });
});
