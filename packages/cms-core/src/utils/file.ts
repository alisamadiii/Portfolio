/**
 * Define file types and provide Helper functions (get file info, get parent path, normalize paths...)
 */

import slugify from "slugify";

const extensionCategories: Record<string, string[]> = {
  image: [
    "jpg",
    "jpeg",
    "apng",
    "png",
    "gif",
    "svg",
    "ico",
    "avif",
    "bmp",
    "tif",
    "tiff",
    "webp",
  ],
  document: ["pdf", "doc", "docx", "ppt", "pptx", "vxls", "xlsx", "txt", "rtf"],
  video: [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "flv",
    "mpeg",
    "webm",
    "ogv",
    "ts",
    "3gp",
    "3g2",
  ],
  audio: [
    "mp3",
    "wav",
    "aac",
    "ogg",
    "flac",
    "weba",
    "oga",
    "opus",
    "mid",
    "midi",
    "3gp",
    "3g2",
  ],
  compressed: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz", "bz2"],
  code: [
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "scss",
    "json",
    "xml",
    "yaml",
    "yml",
    "md",
    "py",
    "rb",
    "php",
    "java",
    "c",
    "cpp",
    "h",
    "cs",
    "go",
    "rs",
    "sql",
  ],
  font: ["ttf", "otf", "woff", "woff2", "eot"],
  spreadsheet: ["csv", "tsv", "ods"],
};

const getFileExtension = (path: string): string => {
  const filename = getFileName(path);
  if (filename.startsWith(".") && !filename.includes(".", 1)) return "";
  const extensionMatch = /(?:\.([^.]+))?$/.exec(filename);
  return extensionMatch?.[1] ?? "";
};

function getFileName(path: string): string {
  return normalizePath(path).split("/").pop() || "";
}

function normalizePath(path: string): string {
  const pathSegments = path.replace("//", "/").replace(/\/+$/, "").split("/");

  const normalizedPathSegments = pathSegments.reduce(
    (acc: string[], segment: string) => {
      if (segment === "..") {
        if (acc.length === 0 || acc[acc.length - 1] === "..") {
          acc.push(segment);
        } else {
          acc.pop();
        }
      } else if (segment !== "." && segment !== "") {
        acc.push(segment);
      }
      return acc;
    },
    []
  );

  return normalizedPathSegments.join("/");
}

const joinPathSegments = (segments: string[]): string => {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter((segment) => segment.length > 0)
    .join("/");
};

const decodePathSafely = (path: string): string => {
  let current = path;
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
};

const isAbsoluteMediaUrl = (value: string): boolean =>
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("//") ||
  value.startsWith("data:");

const normalizeMediaPath = (path: string): string => {
  if (!path) return path;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  const [pathWithoutHash, hash = ""] = path.split("#");
  const [pathname = "", query = ""] = (pathWithoutHash ?? "").split("?");
  const decodedPath = decodePathSafely(pathname);
  const hasLeadingSlash = decodedPath.startsWith("/");
  const normalizedPath = normalizePath(decodedPath);
  const withSlash = hasLeadingSlash ? `/${normalizedPath}` : normalizedPath;
  const withQuery = query ? `${withSlash}?${query}` : withSlash;
  return hash ? `${withQuery}#${hash}` : withQuery;
};

export {
  getFileExtension,
  getFileName,
  normalizePath,
  normalizeMediaPath,
  isAbsoluteMediaUrl,
  joinPathSegments,
  decodePathSafely,
  extensionCategories,
};
