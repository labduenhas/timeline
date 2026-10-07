export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinejoin="miter">
        <circle cx="32" cy="32" r="20" />
        <path d="M18.5 46.5 L32 12.5 L45.5 46.5" />
        <path d="M11.5 33.5 H52.5" />
      </g>
    </svg>
  )
}
