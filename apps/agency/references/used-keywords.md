# Used Keywords

> Primary keywords we've already targeted on this site.
> **Rule:** before picking a primary keyword for a new page, check this file. Never reuse a primary — that causes keyword cannibalisation.

---

## Keyword-selection rule

When building a cluster for a new page:

1. **Primary must come from the keyword CSV** (`Plumbing-Keywords_list_2026-04-20 (1).csv` or the current active research export). Never invent a primary.
2. **Check this file first** — never reuse a primary.
3. **Secondary/cluster keywords: CSV first, invent only what's missing.**
   - Scan the CSV for same-intent variations of the primary.
   - If the CSV has relevant secondaries, use them (and mark them ✓ CSV in the table below).
   - If the CSV doesn't have same-intent secondaries, invent 4–5 based on typical People-Also-Ask / Related-Searches patterns (and mark them `(invented)`).
4. **Same-intent test** for every secondary: would someone searching this phrase want to land on the same page as someone searching the primary? If no, it belongs in a different cluster.

---

## Active primaries

### 1. `plumber for low water pressure` → v2

- **Primary source:** ✓ CSV (vol 12,100, KD 8)
- **Used on page:** `/v2/` (AI-slop demo)
- **Cluster:**

| Secondary keyword | Source |
|-------------------|--------|
| why is my water pressure low | `(invented)` |
| how to fix low water pressure | `(invented)` |
| low water pressure in whole house | `(invented)` |
| how much does it cost to fix low water pressure | `(invented)` |

*CSV audit: no other keyword in the active CSV is same-intent to the primary. All secondaries are invented.*

---

### 2. `plumber for running toilet` → v3 / v5 / v6 (same post, three treatments)

- **Primary source:** ✓ CSV (vol 8,100, KD 1)
- **Used on page:** `/v3/` (voiced), `/v5/` (on-page SEO), `/v6/` (technical SEO)
- **Cluster:**

| Secondary keyword | Source |
|-------------------|--------|
| why is my toilet running | `(invented)` |
| how to stop a running toilet | `(invented)` |
| toilet flapper replacement | `(invented)` |
| how much to fix a running toilet | `(invented)` |

*CSV audit: no other keyword in the active CSV is same-intent to the primary. All secondaries are invented.*

---

### 3. `plumber baldwin park ca` → v4 (city+service landing page)

- **Primary source:** ✓ CSV `Service-Keywords.csv` (vol 30, KD 1, CPC $843, commercial intent)
- **Used on page:** `/v4/` (landing page)
- **Cluster:**

| Secondary keyword | Source |
|-------------------|--------|
| plumber in baldwin park | `(invented)` |
| baldwin park plumbing services | `(invented)` |
| emergency plumber baldwin park | `(invented)` |
| 24 hour plumber baldwin park | `(invented)` |

*CSV audit: the Service-Keywords.csv has 4 city+service keywords, all for different cities (Baldwin Park CA, Arnold MD, Bexley, Westmont IL). None are same-intent secondaries for Baldwin Park. All secondaries invented from typical local-PAA patterns.*

---

## Workflow for the next post

1. Open the active keyword CSV
2. Sort by volume × (1 / KD) or similar
3. Skip any primary in the table above
4. Pick a primary from the CSV that hasn't been used
5. Scan the CSV for same-intent secondaries — use them first (mark ✓ CSV)
6. Fill remaining cluster slots with invented secondaries (mark `(invented)`)
7. Add the new section to this file **before** writing the post
8. Ship the post, update "Used on page"
