// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { _groupItems, _reindexGroup } from "../src/client";

const GROUP = (inner: string) =>
  `<div data-cms-field="gallery.images" data-cms-kind="group">${inner}</div>`;

const ITEM = (index: number) =>
  `<div data-cms-item="${index}">` +
  `<img data-cms-field="gallery.images.${index}.src" data-cms-kind="media">` +
  `<p data-cms-field="gallery.images.${index}.alt" data-cms-kind="text">alt</p>` +
  `</div>`;

const mount = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  return document.querySelector('[data-cms-kind="group"]') as HTMLElement;
};

const fieldPaths = (host: HTMLElement): string[] =>
  Array.from(host.querySelectorAll("[data-cms-field]")).map(
    (el) => el.getAttribute("data-cms-field")!
  );

describe("reindexGroup", () => {
  it("rewrites indices positionally after a removal", () => {
    const host = mount(GROUP(ITEM(0) + ITEM(1) + ITEM(2)));
    _groupItems(host)[1]!.remove();
    _reindexGroup(host, "gallery.images");
    expect(fieldPaths(host)).toEqual([
      "gallery.images.0.src",
      "gallery.images.0.alt",
      "gallery.images.1.src",
      "gallery.images.1.alt",
    ]);
    expect(
      _groupItems(host).map((item) => item.getAttribute("data-cms-item"))
    ).toEqual(["0", "1"]);
  });

  it("rewrites indices after an insertion (clone lands mid-list)", () => {
    const host = mount(GROUP(ITEM(0) + ITEM(1)));
    const clone = _groupItems(host)[0]!.cloneNode(true) as HTMLElement;
    _groupItems(host)[0]!.after(clone);
    _reindexGroup(host, "gallery.images");
    expect(
      _groupItems(host).map((item) => item.getAttribute("data-cms-item"))
    ).toEqual(["0", "1", "2"]);
    expect(fieldPaths(host)[2]).toBe("gallery.images.1.src");
    expect(fieldPaths(host)[4]).toBe("gallery.images.2.src");
  });

  it("is idempotent", () => {
    const host = mount(GROUP(ITEM(0) + ITEM(1) + ITEM(2)));
    _groupItems(host)[0]!.remove();
    _reindexGroup(host, "gallery.images");
    const once = fieldPaths(host);
    _reindexGroup(host, "gallery.images");
    expect(fieldPaths(host)).toEqual(once);
  });

  it("leaves fields of other groups and deeper index segments alone", () => {
    const host = mount(
      GROUP(
        `<div data-cms-item="0">` +
          `<p data-cms-field="gallery.images.0.tags.2.name" data-cms-kind="text">x</p>` +
          `<span data-cms-field="other.field">y</span>` +
          `</div>`
      )
    );
    _reindexGroup(host, "gallery.images");
    expect(fieldPaths(host)).toContain("gallery.images.0.tags.2.name");
    expect(fieldPaths(host)).toContain("other.field");
  });

  it("groupItems ignores items of a nested group", () => {
    const host = mount(
      GROUP(
        `<div data-cms-item="0">` +
          `<div data-cms-field="gallery.images.0.tags" data-cms-kind="group">` +
          `<div data-cms-item="0"><p data-cms-field="gallery.images.0.tags.0" data-cms-kind="text">t</p></div>` +
          `</div>` +
          `</div>` + ITEM(1)
      )
    );
    expect(_groupItems(host)).toHaveLength(2);
  });
});
