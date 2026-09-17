/** Analytics tab mark — nucleo "chart-3" bars, inherits currentColor. */
export function ChartMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 18 18"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    >
      <path
        d="m7.75,2.75h2.5c.5519,0,1,.4481,1,1v11h-4.5V3.75c0-.5519.4481-1,1-1Z"
        fill="currentColor"
        opacity=".3"
        strokeWidth={0}
      />
      <path d="m7.75,2.75h2.5c.5519,0,1,.4481,1,1v11h-4.5V3.75c0-.5519.4481-1,1-1Z" />
      <path d="m3.25,9.75h3.5v5h-3.5c-.5519,0-1-.4481-1-1v-3c0-.5519.4481-1,1-1Z" />
      <path d="m11.25,6.25h3.5c.5519,0,1,.4481,1,1v6.5c0,.5519-.4481,1-1,1h-3.5V6.25h0Z" />
    </svg>
  );
}
