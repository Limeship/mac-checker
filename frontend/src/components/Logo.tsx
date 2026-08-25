export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Lime Tracker">
      {/* Outer circle */}
      <circle cx="16" cy="16" r="12" fill="var(--accent)" fillOpacity="0.12" stroke="var(--accent)" strokeWidth="1.5"/>
      {/* Three segment lines from centre */}
      <line x1="16" y1="4"    x2="16" y2="28"   stroke="var(--accent)" strokeWidth="1"   opacity="0.45"/>
      <line x1="5.6" y1="10"  x2="26.4" y2="22"  stroke="var(--accent)" strokeWidth="1"   opacity="0.45"/>
      <line x1="5.6" y1="22"  x2="26.4" y2="10"  stroke="var(--accent)" strokeWidth="1"   opacity="0.45"/>
      {/* Centre ring + dot */}
      <circle cx="16" cy="16" r="3"   fill="var(--accent)" opacity="0.5"/>
      <circle cx="16" cy="16" r="1.5" fill="var(--accent)"/>
    </svg>
  );
}
