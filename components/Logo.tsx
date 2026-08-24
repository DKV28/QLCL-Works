export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 225"
      className={className}
      role="img"
      aria-label="QLCL Works"
    >
      <defs>
        <linearGradient id="qlcl-logo-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2158E6" />
          <stop offset="100%" stopColor="#29B6F6" />
        </linearGradient>
      </defs>
      <rect x="10" y="35" width="150" height="150" rx="42" fill="#1B2A6B" />
      <rect x="95" y="65" width="150" height="150" rx="42" fill="url(#qlcl-logo-blue)" />
      <rect x="175" y="15" width="150" height="150" rx="42" fill="#F7941D" />
      <path
        d="M55,100 L115,175 L170,120 L220,180 L250,120"
        fill="none"
        stroke="#fff"
        strokeWidth="30"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon points="300,55 272,134 228,106" fill="#fff" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark className="h-8 w-auto shrink-0" />
      <span className="whitespace-nowrap font-extrabold tracking-tight">
        <span className="text-brand-dark dark:text-white">QLCL</span>{" "}
        <span className="text-brand dark:text-brand-light">Works</span>
      </span>
    </span>
  );
}
