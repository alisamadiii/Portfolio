/**
 * Check if a file path matches any of the allowed glob patterns.
 * Simple glob matching — supports * and ** wildcards.
 */
export function isPathAllowed(filePath: string, allowedPaths: string[]): boolean {
  if (allowedPaths.length === 0) return true; // No restrictions = allow all

  return allowedPaths.some((pattern) => matchGlob(pattern, filePath));
}

function matchGlob(pattern: string, path: string): boolean {
  // Convert glob to regex
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  const regex = new RegExp(`^${regexStr}`);
  return regex.test(path);
}
