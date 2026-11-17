/** Placeholder monogram until the client supplies the official vector logo. */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="Madison D’Or">
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="currentColor" strokeWidth="0.5" />
      <text
        x="50"
        y="64"
        textAnchor="middle"
        fill="currentColor"
        style={{ fontFamily: "var(--serif)", fontSize: 40, letterSpacing: "-0.06em", fontVariationSettings: '"opsz" 14' }}
      >
        MD
      </text>
    </svg>
  );
}
