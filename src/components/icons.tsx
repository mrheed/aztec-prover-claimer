/* Flat, single-stroke icons — no fills, elegant and minimal. */
type P = { className?: string };

export const LogoMark = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" color="var(--lime)">
    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" strokeLinejoin="round" />
    <path d="m7 9 5 3 5-3M12 12v6" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const Check = ({ className }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Wallet = ({ className }: P) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M16 12h2M3 9h13a2 2 0 0 1 2 2" strokeLinecap="round" />
  </svg>
);

export const Bolt = ({ className }: P) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

export const Gear = ({ className }: P) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <circle cx="12" cy="12" r="3.2" />
    <path
      d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
      strokeLinecap="round"
    />
  </svg>
);

export const Search = ({ className }: P) => (
  <svg className={className} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
  </svg>
);
