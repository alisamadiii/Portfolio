// Third-party brand marks for apps whose logo users recognize (Google Ads,
// Google Analytics, Resend). Full color, so they sit on a white tile, never a
// coral one. Our own apps (Leads, Newsletter) keep their lucide icons.

type LogoProps = { className?: string };

export function GoogleAnalyticsLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#F9AB00"
        d="M15.5 3.75v16.5c0 1.845 1.273 2.874 2.625 2.874 1.25 0 2.625-.875 2.625-2.874V3.875c0-1.692-1.25-2.75-2.625-2.75S15.5 2.292 15.5 3.75z"
      />
      <path
        fill="#E37400"
        d="M8.625 12v8.25c0 1.845 1.273 2.874 2.625 2.874 1.25 0 2.625-.875 2.625-2.874v-8.125c0-1.692-1.25-2.75-2.625-2.75S8.625 10.542 8.625 12z"
      />
      <circle fill="#E37400" cx="4.375" cy="20.5" r="2.625" />
    </svg>
  );
}

export function GoogleAdsLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 256 230" aria-hidden>
      <path
        fill="#FBBC04"
        d="M5.888 166.405 90.88 20.9c10.796 6.356 65.236 36.484 74.028 42.213L79.916 208.627c-9.295 12.28-85.804-23.587-74.028-42.231z"
      />
      <path
        fill="#4285F4"
        d="M250.084 166.402 165.092 20.906C153.21 1.132 127.619-6.054 106.6 5.625 85.582 17.304 79.182 42.462 91.064 63.12l84.992 145.513c11.882 19.765 37.473 26.95 58.492 15.272 20.1-11.68 27.418-37.73 15.536-57.486z"
      />
      <ellipse fill="#34A853" cx="42.664" cy="187.924" rx="42.664" ry="41.604" />
    </svg>
  );
}

export function ResendLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden>
      <path
        fill="currentColor"
        d="M156.575 0c49.582 0 79.07 29.488 79.07 68.632 0 39.144-29.488 68.632-79.07 68.632h-25.052L256 256h-87.943l-94.728-90.03c-6.784-6.264-9.916-13.57-9.916-19.833 0-8.873 6.263-16.701 18.267-20.094l48.8-13.048c18.527-4.958 31.314-19.31 31.314-38.1 0-22.964-18.789-36.274-42.014-36.274H0V0h156.575z"
      />
    </svg>
  );
}
