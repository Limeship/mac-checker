export function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="15" fill="var(--surface)" stroke="var(--border)" strokeWidth="1"/>
      <path
        d="M16 7 C20 7 24 10 24 16 C24 19 22 21.5 19 22.5 C16 23.5 12 22 10 19 C8 16 9 11 12 9 C13.5 8 15 7 16 7Z"
        fill="var(--accent)" opacity="0.9"
      />
      <path d="M16 7 C15 5 14 4 13 3.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <path d="M13 19 C14.5 16 15.5 13 16 7" stroke="var(--bg)" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
