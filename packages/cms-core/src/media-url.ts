/**
 * Pure helpers to translate media paths between relative repo paths and
 * publicly accessible GitHub raw.githubusercontent.com URLs. No fetching —
 * safe to import from both server and client code. The fetch-based
 * counterparts (getRawUrl, relativeToRawUrls) live in the hub app.
 */

// Swap the prefix of an image path (raw.githubusercontent.com url <> relative path)
const swapPrefix = (
  path: string,
  from: string,
  to: string,
  relative = false
) => {
  if (
    path == null ||
    from == null ||
    to == null ||
    from === to ||
    path.startsWith("//") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:image/") ||
    !path.startsWith(from)
  )
    return path;

  let newPath;

  if (from === "" && to !== "/") {
    newPath = `${to}/${path}`;
  } else if (from === "" && to === "/") {
    newPath = `/${path}`;
  } else {
    const remainingPath = path.slice(from.length);
    newPath =
      to === "/"
        ? `/${remainingPath.replace(/^\//, "")}`
        : `${to}/${remainingPath.replace(/^\//, "")}`;
  }

  if (newPath && newPath.startsWith("/") && relative)
    newPath = newPath.substring(1);

  return newPath;
};

// Encode a path for use in a URL.
const encodePath = (path: string) => {
  return path.split("/").map(encodeURIComponent).join("/");
};

export {
  swapPrefix,
  encodePath,
};
