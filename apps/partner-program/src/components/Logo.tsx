/** The Ali Samadii LLC mark (same file as www.alisamadii.com). */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size, display: 'block', flexShrink: 0 }}
    />
  );
}
