// Third-party brand marks for apps whose logo users recognize (Google Ads,
// Google Analytics, Google Calendar, Resend). Full color, so they sit on a
// white tile, never a coral one. Our own apps (Leads, Newsletter) keep their lucide icons.

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

export function NeonLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 36 36" aria-hidden>
      <path
        fill="#00E599"
        fillRule="evenodd"
        d="M0 6.207A6.207 6.207 0 0 1 6.207 0h23.586A6.207 6.207 0 0 1 36 6.207v20.06c0 3.546-4.488 5.085-6.664 2.286l-6.805-8.754v10.615A5.586 5.586 0 0 1 16.945 36H6.207A6.207 6.207 0 0 1 0 29.793V6.207Zm6.207-1.241c-.686 0-1.241.555-1.241 1.24v23.587c0 .686.555 1.242 1.241 1.242h10.862c.343 0 .5-.278.5-.621V16.18c0-3.547 4.488-5.086 6.665-2.286l6.805 8.753V6.207c0-.686.064-1.241-.621-1.241H6.207Z"
      />
    </svg>
  );
}

// Same mark as the agency landing page's platform cards (simple-icons Wix, #0C6EFC).
export function WixLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 7 24 10" aria-hidden>
      <path
        fill="#0C6EFC"
        d="m0 7.354 2.113 9.292h.801a1.54 1.54 0 0 0 1.506-1.218l1.351-6.34a.171.171 0 0 1 .167-.137c.08 0 .15.058.167.137l1.352 6.34a1.54 1.54 0 0 0 1.506 1.218h.805l2.113-9.292h-.565c-.62 0-1.159.43-1.296 1.035l-1.26 5.545-1.106-5.176a1.76 1.76 0 0 0-2.19-1.324c-.639.176-1.113.716-1.251 1.365l-1.094 5.127-1.26-5.537A1.33 1.33 0 0 0 .563 7.354H0zm13.992 0a.951.951 0 0 0-.951.95v8.342h.635a.952.952 0 0 0 .951-.95V7.353h-.635zm1.778 0 3.158 4.66-3.14 4.632h1.325c.368 0 .712-.181.918-.486l1.756-2.59a.12.12 0 0 1 .197 0l1.754 2.59c.206.305.55.486.918.486h1.326l-3.14-4.632L24 7.354h-1.326c-.368 0-.712.181-.918.486l-1.772 2.617a.12.12 0 0 1-.197 0L18.014 7.84a1.108 1.108 0 0 0-.918-.486H15.77z"
      />
    </svg>
  );
}

export function GoogleCalendarLogo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#fff" d="M18.3 5.7H5.7v12.6h12.6z" />
      <path fill="#EA4335" d="M18.3 24 24 18.3h-5.7z" />
      <path fill="#FBBC04" d="M24 5.7h-5.7v12.6H24z" />
      <path fill="#34A853" d="M18.3 18.3H5.7V24h12.6z" />
      <path fill="#188038" d="M0 18.3v3.8C0 23.1.9 24 1.9 24h3.8v-5.7z" />
      <path fill="#1967D2" d="M24 5.7V1.9C24 .9 23.1 0 22.1 0h-3.8v5.7z" />
      <path fill="#4285F4" d="M18.3 0H1.9C.9 0 0 .9 0 1.9v16.4h5.7V5.7h12.6z" />
      <text
        x="12"
        y="16.2"
        textAnchor="middle"
        fontFamily="Arial, sans-serif"
        fontSize="8"
        fontWeight="700"
        fill="#4285F4"
      >
        31
      </text>
    </svg>
  );
}
