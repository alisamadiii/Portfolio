/**
 * CMS v2 manifest store.
 *
 * A v2 repo ships exactly one root `_site.json` (keys `cms` = the manifest:
 * baseUrl, media, page→route map; plus schema-less `seo` and `variables` bags)
 * and a root `_pages.json` for page content. Collections are NOT declared in the
 * file — they are discovered by listing the root `_collections/` folder. There is
 * NO fallback: a repo without a root `_site.json` is simply not a v2 repo, and the
 * hub surfaces that to the user rather than reading anything under `src/data`.
 *
 * The cache reuses the legacy `hubConfig` table: a repo is either legacy or
 * v2, so the (owner, repo, branch) row is never contested. Rows are
 * distinguished by the `version` column (`manifestVersion` vs the legacy
 * `configVersion`), which makes v1/v2 rows self-invalidating on engine switch.
 */

import { and, eq, sql } from "drizzle-orm";
import z from "zod";

import { joinPathSegments, normalizePath } from "@workspace/cms-core/utils/file";

import { db, configTable } from "./db";
import { createOctokitInstance } from "./octokit";
import { getBasePath, getPublicMediaSettings } from "./repo-settings";

const manifestVersion = "cms-v2.1";

/**
 * The v2 contract: one config file `_site.json` (keys `cms`, `seo`, `variables`)
 * plus the page-content file `_pages.json`, both at the basePath ROOT. The
 * leading underscore groups every CMS-owned artifact (these two + the
 * `_collections/` folder) at the top of the file tree. Repo-relative
 * (pre-basePath) locations below.
 */
const SITE_FILE = "_site.json";
const PAGES_FILE = "_pages.json";
// Collections are AUTO-DISCOVERED from this folder — they are NOT declared in
// _site.json. Each subfolder is a directory collection (md/json entries); each
// top-level `.json` file is an array collection; a folder named `blog` is the
// blog (see isBlogCollection). Adding a folder here makes it appear in the CMS.
const COLLECTIONS_DIR = "_collections";

const CollectionFieldSchema = z.object({
  name: z.string().min(1),
  type: z
    .enum(["string", "text", "image", "date", "boolean", "number", "select"])
    .default("string"),
  label: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  // Image fields only: opt into the multi-image gallery widget (value is string[]).
  multiple: z
    .union([z.boolean(), z.object({ max: z.number().optional() })])
    .optional(),
});

const CollectionSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  route: z.string().optional(),
  label: z.string().optional(),
  /** Entry file format. Defaults to Markdown (frontmatter + body). */
  format: z.enum(["md", "json"]).optional(),
  fields: z.array(CollectionFieldSchema).default([]),
});

const ManifestObjectSchema = z.object({
  version: z.literal(1),
  baseUrl: z.string().url(),
  media: z
    .object({ input: z.string().min(1), output: z.string().min(1) })
    .optional(),
  pages: z.record(
    z.string().min(1),
    z.object({ route: z.string().min(1), title: z.string().optional() })
  ),
  // Collections are discovered from _collections/, not read from the file. Any
  // `collections` key in _site.json is ignored (kept lenient for back-compat).
  collections: z.array(CollectionSchema).default([]),
});

/**
 * Combined `_site.json`: the manifest under `cms`, plus schema-less `seo` and
 * `variables` bags (kept loose on purpose — per-client shapes vary).
 */
const SiteFileSchema = z.object({
  cms: ManifestObjectSchema,
  seo: z.record(z.string(), z.any()).optional(),
  variables: z.record(z.string(), z.any()).optional(),
});

type ManifestPaths = {
  manifest: string;
  /** The single root config file (equals `manifest`). */
  site: string;
  pages: string;
  /** variables + seo live inside _site.json, so both resolve to it. */
  variables: string;
  seo: string;
};

type ManifestObject = z.infer<typeof ManifestObjectSchema> & {
  /** Physical (basePath-rebased) paths the hub reads/writes. */
  paths: ManifestPaths;
  /** `seo` + `variables` read inline from _site.json. */
  seo: Record<string, unknown>;
  variables: Record<string, unknown>;
};

type Manifest = {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  object: ManifestObject;
  lastCheckedAt?: Date;
  mediaSettings?: Awaited<ReturnType<typeof getPublicMediaSettings>>;
};

/** camelCase / kebab-case key → "Title Case" label. */
const labelize = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const rebase = (basePath: string, path: string): string =>
  normalizePath(basePath ? joinPathSegments([basePath, path]) : path);

type DiscoveredCollection = z.infer<typeof CollectionSchema>;

/**
 * Discover collections by listing the repo's `_collections/` folder — the CMS's
 * source of truth, replacing any `collections` declared in _site.json. A subdir
 * is a directory collection; a top-level `.json` file is an array collection.
 * Paths are pre-basePath (`_collections/<name>`); rebaseCms prepends basePath.
 * A missing `_collections/` folder → no collections.
 */
const discoverCollections = async (
  octokit: ReturnType<typeof createOctokitInstance>,
  owner: string,
  repo: string,
  branch: string,
  basePath: string
): Promise<DiscoveredCollection[]> => {
  let children: Array<{ name: string; type: string }>;
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: rebase(basePath, COLLECTIONS_DIR),
      ref: branch,
    });
    if (!Array.isArray(response.data)) return [];
    children = response.data;
  } catch (error: any) {
    if (error?.status === 404) return [];
    throw error;
  }

  const collections: DiscoveredCollection[] = [];
  for (const child of children) {
    if (child.type === "dir") {
      collections.push({
        name: child.name,
        label: labelize(child.name),
        path: `${COLLECTIONS_DIR}/${child.name}`,
        fields: [],
      });
    } else if (child.type === "file" && child.name.endsWith(".json")) {
      const name = child.name.replace(/\.json$/, "");
      collections.push({
        name,
        label: labelize(name),
        path: `${COLLECTIONS_DIR}/${child.name}`,
        fields: [],
      });
    }
  }
  // Stable, alphabetical rail order (no authored order without a manifest).
  return collections.sort((a, b) => a.name.localeCompare(b.name));
};

/** Rebase a validated manifest's collection + media paths in place. */
const rebaseCms = (
  cms: z.infer<typeof ManifestObjectSchema>,
  basePath: string
) => ({
  ...cms,
  collections: cms.collections.map((collection) => ({
    ...collection,
    path: rebase(basePath, collection.path),
  })),
  media: cms.media
    ? { ...cms.media, input: rebase(basePath, cms.media.input) }
    : undefined,
});

/**
 * Validate the fetched `_site.json` (`cms`/`seo`/`variables`) and attach physical
 * paths. `collections` come from folder discovery, not the file. seo + variables
 * ride inline; every config path resolves to the one root _site.json, page
 * content to the root _pages.json.
 */
const normalizeManifest = (
  raw: unknown,
  basePath: string,
  discovered: DiscoveredCollection[]
): ManifestObject => {
  const site = SiteFileSchema.parse(raw);
  return {
    ...rebaseCms({ ...site.cms, collections: discovered }, basePath),
    seo: site.seo ?? { site: {}, pages: {} },
    variables: site.variables ?? {},
    paths: {
      manifest: rebase(basePath, SITE_FILE),
      site: rebase(basePath, SITE_FILE),
      pages: rebase(basePath, PAGES_FILE),
      variables: rebase(basePath, SITE_FILE),
      seo: rebase(basePath, SITE_FILE),
    },
  };
};

const getManifestFromDb = async (
  owner: string,
  repo: string,
  branch: string
): Promise<Manifest | null> => {
  const row = await db.query.hubConfig.findFirst({
    where: and(
      sql`lower(${configTable.owner}) = lower(${owner})`,
      sql`lower(${configTable.repo}) = lower(${repo})`,
      eq(configTable.branch, branch)
    ),
  });
  if (!row || row.version !== manifestVersion) return null;
  return {
    owner: row.owner,
    repo: row.repo,
    branch: row.branch,
    sha: row.sha,
    version: row.version,
    object: JSON.parse(row.object),
    lastCheckedAt: row.lastCheckedAt ?? undefined,
  };
};

const saveManifest = async (manifest: Manifest): Promise<void> => {
  await db
    .insert(configTable)
    .values({
      owner: manifest.owner,
      repo: manifest.repo,
      branch: manifest.branch,
      sha: manifest.sha,
      version: manifest.version,
      object: JSON.stringify(manifest.object),
      lastCheckedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [configTable.owner, configTable.repo, configTable.branch],
      set: {
        sha: manifest.sha,
        version: manifest.version,
        object: JSON.stringify(manifest.object),
        lastCheckedAt: new Date(),
      },
    });
};

const DEFAULT_MANIFEST_TTL_MS =
  parseInt(process.env.CONFIG_CHECK_MIN || "5", 10) * 60 * 1000;

const isCheckDue = (lastCheckedAt?: Date, ttlMs = DEFAULT_MANIFEST_TTL_MS) => {
  if (!lastCheckedAt) return true;
  return Date.now() - new Date(lastCheckedAt).getTime() > ttlMs;
};

/** Fetch one repo file as decoded text, or null on 404. */
const fetchFile = async (
  octokit: ReturnType<typeof createOctokitInstance>,
  owner: string,
  repo: string,
  path: string,
  branch: string
): Promise<{ sha: string; raw: string } | null> => {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (Array.isArray(response.data) || response.data.type !== "file") {
      throw new Error(`Expected ${path} to be a file.`);
    }
    return {
      sha: response.data.sha,
      raw: Buffer.from(response.data.content, "base64").toString(),
    };
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
};

/**
 * Read the root `_site.json`. Returns null when it doesn't exist — there is no
 * `src/data` fallback: such a repo is simply not a v2 (_site.json) project.
 */
const fetchManifestFromGithub = async (
  owner: string,
  repo: string,
  branch: string,
  token: string,
  basePath: string
): Promise<Pick<Manifest, "sha" | "object"> | null> => {
  const octokit = createOctokitInstance(token);

  const site = await fetchFile(
    octokit,
    owner,
    repo,
    rebase(basePath, SITE_FILE),
    branch
  );
  if (!site) return null;

  const collections = await discoverCollections(
    octokit,
    owner,
    repo,
    branch,
    basePath
  );

  return {
    sha: site.sha,
    object: normalizeManifest(JSON.parse(site.raw), basePath, collections),
  };
};

const manifestSyncInFlight = new Map<string, Promise<Manifest | null>>();

type GetManifestOptions = {
  getToken?: () => Promise<string>;
  ttlMs?: number;
};

/**
 * Cached manifest for a repo, or null when the repo has no cms.json (legacy
 * or unconfigured). A malformed cms.json push fails soft: the last-good
 * cached row is kept and returned so the dashboard stays usable.
 */
const getManifest = async (
  owner: string,
  repo: string,
  branch: string,
  options?: GetManifestOptions
): Promise<Manifest | null> => {
  const normalizedOwner = owner.toLowerCase();
  const normalizedRepo = repo.toLowerCase();
  const key = `${normalizedOwner}::${normalizedRepo}::${branch}`;
  const existing = manifestSyncInFlight.get(key);
  if (existing) return existing;

  const run = (async (): Promise<Manifest | null> => {
    const basePath = await getBasePath(normalizedOwner, normalizedRepo);
    const cached = await getManifestFromDb(
      normalizedOwner,
      normalizedRepo,
      branch
    );
    if (cached && !isCheckDue(cached.lastCheckedAt, options?.ttlMs)) {
      return cached;
    }

    const token = options?.getToken ? await options.getToken() : null;
    if (!token) return cached;

    let latest: Pick<Manifest, "sha" | "object"> | null;
    try {
      latest = await fetchManifestFromGithub(
        owner,
        repo,
        branch,
        token,
        basePath
      );
    } catch {
      // Fetch/validation failure: keep serving the last-good manifest.
      return cached;
    }

    if (!latest) {
      if (cached) {
        await db
          .delete(configTable)
          .where(
            and(
              sql`lower(${configTable.owner}) = lower(${normalizedOwner})`,
              sql`lower(${configTable.repo}) = lower(${normalizedRepo})`,
              eq(configTable.branch, branch)
            )
          );
      }
      return null;
    }

    const next: Manifest = {
      owner: normalizedOwner,
      repo: normalizedRepo,
      branch,
      sha: latest.sha,
      version: manifestVersion,
      object: latest.object,
    };
    await saveManifest(next);
    return next;
  })();

  // Media settings attach at read time (never persisted), same as getConfig.
  const withMediaSettings = run.then(async (manifest) => {
    if (!manifest) return null;
    const mediaSettings = await getPublicMediaSettings(
      normalizedOwner,
      normalizedRepo
    );
    return { ...manifest, mediaSettings };
  });

  manifestSyncInFlight.set(key, withMediaSettings);
  try {
    return await withMediaSettings;
  } finally {
    manifestSyncInFlight.delete(key);
  }
};

export {
  getManifest,
  labelize,
  manifestVersion,
  ManifestObjectSchema,
  SITE_FILE,
  PAGES_FILE,
};
export type { Manifest, ManifestObject };
