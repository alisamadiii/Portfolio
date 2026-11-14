import type { ReactNode } from 'react';

export function Eyebrow({ children, dot = false, reveal }: { children: ReactNode; dot?: boolean; reveal?: string }) {
  return (
    <p className="eyebrow" data-reveal={reveal}>
      {dot && <span className="eyebrow__dot" aria-hidden="true" />}
      {children}
    </p>
  );
}
