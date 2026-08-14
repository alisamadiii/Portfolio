/**
 * Helper functions to translate relative paths into publicly accessible GitHub
 * raw.githubusercontent.com URLs (required for images in private repositories).
 * Runs client-side with some temporary caching.
 *
 * Pure (fetch-free) helpers live in `@workspace/cms-core/media-url` and are
 * re-exported here for convenience; only the fetch-based parts are hub-local.
 */

import { queryClient, trpcClient, trpcProxy } from "@workspace/trpc/client";

import {
  canonicalizeFileName,
  encodePath,
  escapeRegex,
  getImgSrcs,
  getRelativeUrl,
  htmlSwapPrefix,
  normalizeImagePathInput,
  rawToRelativeUrls,
  swapPrefix,
} from "@workspace/cms-core/media-url";
import {
  decodePathSafely,
  getParentPath,
} from "@workspace/cms-core/utils/file";

// Get the raw.githubusercontent.com URL for an image.
const getRawUrl = async (
  owner: string,
  repo: string,
  branch: string,
  name: string,
  path: string,
  isPrivate = false,
  decode = false
) => {
  const decodedPath = decode ? decodePathSafely(path) : path;
  const normalizedInputPath = normalizeImagePathInput(decodedPath);
  if (!normalizedInputPath) return null;

  if (isPrivate) {
    const filename = canonicalizeFileName(normalizedInputPath);
    if (!filename) return null;
    const parentPath = getParentPath(normalizedInputPath);

    const listInput = {
      owner,
      repo,
      branch,
      name,
      path: parentPath,
      nocache: true,
    };

    // The QueryClient dedupes concurrent in-flight requests and serves
    // cached data within staleTime — replaces the old hand-rolled TTL cache.
    // The client binding is assigned when the provider first renders; this
    // code only runs post-mount, but fall back to a direct call just in case.
    const items = queryClient
      ? await queryClient.fetchQuery(
          trpcProxy.cms.media.list.queryOptions(listInput, {
            staleTime: 30_000,
          })
        )
      : await trpcClient.cms.media.list.query(listInput);

    const files: Record<string, string> = {};
    items.forEach((file: any) => {
      const canonicalName = canonicalizeFileName(
        typeof file?.path === "string" && file.path
          ? file.path
          : file?.name || ""
      );
      if (canonicalName) files[canonicalName] = file.url;
    });

    return files[filename];
  } else {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${encodeURI(normalizedInputPath)}`;
  }
};

// Convert all relative image paths in a HTML string to raw.githubusercontent.com URLs.
const relativeToRawUrls = async (
  owner: string,
  repo: string,
  branch: string,
  name: string,
  html: string,
  isPrivate = false,
  decode = false
) => {
  const matches = getImgSrcs(html);
  if (matches.length === 0) return html;

  const uniqueSources = Array.from(
    new Set(
      matches
        .map((match) => match[1] || match[2])
        .filter(
          (src) =>
            !src.startsWith("http://") &&
            !src.startsWith("https://") &&
            !src.startsWith("data:image/")
        )
    )
  );

  if (uniqueSources.length === 0) return html;

  const replacementEntries = await Promise.all(
    uniqueSources.map(async (src) => {
      const rawUrl = await getRawUrl(
        owner,
        repo,
        branch,
        name,
        src,
        isPrivate,
        true
      );
      return [src, rawUrl] as const;
    })
  );

  let newHtml = html;
  for (const [src, rawUrl] of replacementEntries) {
    if (!rawUrl) continue;
    const srcRegex = new RegExp(
      `(<img[^>]*\\ssrc=(["']))${escapeRegex(src)}(\\2)`,
      "g"
    );
    newHtml = newHtml.replace(srcRegex, `$1${rawUrl}$3`);
  }

  return newHtml;
};

export {
  getRelativeUrl,
  getRawUrl,
  relativeToRawUrls,
  rawToRelativeUrls,
  swapPrefix,
  htmlSwapPrefix,
  encodePath,
  getImgSrcs,
};
