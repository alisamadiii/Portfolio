/**
 * CMS v2 manifest store.
 *
 * A v2 repo has no `.pages.yml` — instead it ships `src/data/cms.json` (the
 * "manifest"): baseUrl, media config, the page-name → route map and optional
 * collection declarations. This module fetches, validates and caches it.
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

/** Repo-relative (pre-basePath) location of the manifest. */
const MANIFEST_FILE = "src/data/cms.json";
const PAGES_FILE = "src/data/pages.json";
const VARIABLES_FILE = "src/data/variables.json";
const SEO_FILE = "src/data/seo.json";

const CollectionFieldSchema = z.object({
  name: z.string().min(1),
  type: z
    .enum(["string", "text", "image", "date", "boolean", "number", "select"])
    .default("string"),
  label: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
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
  collections: z.array(CollectionSchema).default([]),
});

type ManifestObject = z.infer<typeof ManifestObjectSchema> & {
  /** Physical (basePath-rebased) paths the hub reads/writes. */
  paths: { manifest: string; pages: string; variables: string; seo: string };
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

/** Validate raw JSON and attach physical paths (collections rebased in place). */
const normalizeManifest = (
  raw: unknown,
  basePath: string
): ManifestObject => {
  const parsed = ManifestObjectSchema.parse(raw);
  return {
    ...parsed,
    collections: parsed.collections.map((collection) => ({
      ...collection,
      path: rebase(basePath, collection.path),
    })),
    media: parsed.media
      ? { ...parsed.media, input: rebase(basePath, parsed.media.input) }
      : undefined,
    paths: {
      manifest: rebase(basePath, MANIFEST_FILE),
      pages: rebase(basePath, PAGES_FILE),
      variables: rebase(basePath, VARIABLES_FILE),
      seo: rebase(basePath, SEO_FILE),
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

const fetchManifestFromGithub = async (
  owner: string,
  repo: string,
  branch: string,
  token: string,
  basePath: string
): Promise<Pick<Manifest, "sha" | "object"> | null> => {
  const octokit = createOctokitInstance(token);
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: rebase(basePath, MANIFEST_FILE),
      ref: branch,
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (Array.isArray(response.data) || response.data.type !== "file") {
      throw new Error("Expected cms.json to be a file.");
    }
    const raw = Buffer.from(response.data.content, "base64").toString();
    return {
      sha: response.data.sha,
      object: normalizeManifest(JSON.parse(raw), basePath),
    };
  } catch (error: any) {
    if (error?.status === 404) return null;
    throw error;
  }
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
  MANIFEST_FILE,
  PAGES_FILE,
  VARIABLES_FILE,
  SEO_FILE,
};
export type { Manifest, ManifestObject };
