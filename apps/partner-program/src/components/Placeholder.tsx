/** Highlights config values that are still [placeholders]. */
export function Ph({ children }: { children: string }) {
  return children.trim().startsWith('[') ? <span className="ph">{children}</span> : <>{children}</>;
}
