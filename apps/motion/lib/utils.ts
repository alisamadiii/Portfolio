export const updateSourceCode = (code: string) => {
  const updatedCode = code.replaceAll("@workspace/ui", "@");

  return updatedCode;
};

// Package names to exclude from getPackagesFromCode result (e.g. "react", "lucide-react")
export const PACKAGES_TO_IGNORE: string[] = ["react"];

// Optional links for packages. Key = package name, value = URL (e.g. docs or npm).
export const PACKAGE_LINKS: Record<string, string> = {
  motion: "https://motion.dev",
  "lucide-react": "https://lucide.dev",
  "@zuude-ui/ios-mockups": "https://packages.zuude-ui.com/docs/ios-mockups",
  "rc-progress": "https://github.com/react-component/progress",
  "react-use-measure": "https://github.com/pmndrs/react-use-measure",
  "react-hotkeys-hook": "https://github.com/JohannesKlauss/react-hotkeys-hook",
  "date-fns": "https://date-fns.org",
};

// Matches module specifier in: from "..." or from '...'
const IMPORT_FROM_REGEX = /from\s+["']([^"']+)["']/g;

/**
 * Extracts the npm package name from an import specifier.
 * - "react" → "react"
 * - "motion/react" → "motion"
 * - "@zuude-ui/mockup" → "@zuude-ui/mockup"
 * - "@zuude-ui/mockup/Button" → "@zuude-ui/mockup" (subpath removed)
 */
function getPackageName(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("@workspace/"))
    return null;
  if (specifier.startsWith("@")) {
    const rest = specifier.slice(1);
    const firstSlash = rest.indexOf("/");
    if (firstSlash === -1) return `@${rest}`;
    // Scoped package: @scope/name (take first two segments; rest is subpath)
    const afterScope = rest.slice(firstSlash + 1);
    const secondSlash = afterScope.indexOf("/");
    const name =
      secondSlash === -1 ? rest : rest.slice(0, firstSlash + 1 + secondSlash);
    return `@${name}`;
  }
  const slash = specifier.indexOf("/");
  const name = slash === -1 ? specifier : specifier.slice(0, slash);
  return name && name !== "." ? name : null;
}

/**
 * Returns unique external package names from import statements, in order of first appearance.
 * Skips @workspace/ packages and any name in PACKAGES_TO_IGNORE.
 * e.g. "motion/react" → "motion", "react" → "react".
 */
export const getPackagesFromCode = (
  code: string,
  ignore: string[] = PACKAGES_TO_IGNORE
): { name: string; link?: string }[] => {
  const ignoreSet = new Set(ignore.map((s) => s.toLowerCase()));
  const seen = new Set<string>();
  const packages: { name: string; link?: string }[] = [];
  for (const match of code.matchAll(IMPORT_FROM_REGEX)) {
    const name = getPackageName(match[1]);
    if (name != null && !seen.has(name) && !ignoreSet.has(name.toLowerCase())) {
      seen.add(name);
      packages.push({ name, link: PACKAGE_LINKS[name] });
    }
  }
  return packages;
};
