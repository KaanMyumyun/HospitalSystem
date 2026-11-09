import type { ReactNode } from 'react'

const paths = {
  'chevron-left': <path d="M12.5 4.5 7 10l5.5 5.5" />,
  'chevron-right': <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />,
  'chevron-down': <path d="m5 7.5 5 5 5-5" />,
  'arrow-right': <path d="M4 10h12m-5-5 5 5-5 5" />,
  'arrow-left': <path d="M16 10H4m5-5-5 5 5 5" />,
  'arrow-up-right': <path d="M6.5 13.5 13.5 6.5M8 6h5.5v5.5" />,
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  close: <path d="m5.5 5.5 9 9m0-9-9 9" />,
  check: <path d="m4.5 10.5 3.5 3.5 7.5-8" />,
  search: (
    <>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.5 3.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.25" />
      <path d="M10 2.75v1.5m0 11.5v1.5M2.75 10h1.5m11.5 0h1.5M4.87 4.87l1.06 1.06m8.14 8.14 1.06 1.06M4.87 15.13l1.06-1.06m8.14-8.14 1.06-1.06" />
    </>
  ),
  moon: <path d="M15.75 12.4A6.4 6.4 0 0 1 7.6 4.25a6.4 6.4 0 1 0 8.15 8.15Z" />,
  monitor: (
    <>
      <rect x="3" y="4" width="14" height="9.5" rx="2" />
      <path d="M7.5 16.5h5M10 13.5v3" />
    </>
  ),
  logout: <path d="M8.5 4H6a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 6 16h2.5M12 6.5 15.5 10 12 13.5M15.5 10H8" />,
  key: (
    <>
      <circle cx="6.75" cy="13.25" r="3" />
      <path d="m9 11 6.5-6.5m-2.25 2.25 1.75 1.75" />
    </>
  ),
  refresh: <path d="M15.5 8.5A5.75 5.75 0 0 0 5 6.25M4.5 3.5V7H8m-3.5 4.5A5.75 5.75 0 0 0 15 13.75m.5 2.75V13H12" />,
  menu: <path d="M3.5 6h13m-13 4h13m-13 4h13" />,
  move: <path d="M10 3.5v13m-3-10 3-3 3 3m-6 7 3 3 3-3" />,
  slash: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="m5.4 14.6 9.2-9.2" />
    </>
  ),
  alert: <path d="M10 3.75 17.25 16H2.75L10 3.75ZM10 8.25v3.5m0 2.25v.01" />,
  lock: (
    <>
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.75" />
      <path d="M7 9V6.75a3 3 0 0 1 6 0V9" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5V10l2.5 1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="13" height="12" rx="2" />
      <path d="M3.5 8.5h13M7 3v3m6-3v3" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="7" r="3" />
      <path d="M4.25 16.5c.8-2.9 3.05-4.4 5.75-4.4s4.95 1.5 5.75 4.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 10s2.75-5 7.5-5 7.5 5 7.5 5-2.75 5-7.5 5-7.5-5-7.5-5Z" />
      <circle cx="10" cy="10" r="2.25" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M8.2 5.2A7.4 7.4 0 0 1 10 5c4.75 0 7.5 5 7.5 5a12.6 12.6 0 0 1-1.9 2.5M12.1 12.2A3 3 0 0 1 7.8 7.9M5.2 6.4A12.4 12.4 0 0 0 2.5 10s2.75 5 7.5 5a7.2 7.2 0 0 0 3.5-.9" />
      <path d="m3.5 3.5 13 13" />
    </>
  ),
  edit: <path d="m12.25 4.75 3 3L8 15H5v-3l7.25-7.25Z" />,
  more: (
    <>
      <circle cx="5" cy="10" r=".9" />
      <circle cx="10" cy="10" r=".9" />
      <circle cx="15" cy="10" r=".9" />
    </>
  ),
  history: (
    <>
      <path d="M3.75 10a6.25 6.25 0 1 0 1.9-4.5M3.5 3.75V7h3.25" />
      <path d="M10 7v3.25l2.25 1.5" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className ? `icon ${className}` : 'icon'}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 20 20"
      width={size}
    >
      {paths[name]}
    </svg>
  )
}

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg aria-hidden="true" className="mark" focusable="false" height={size} viewBox="0 0 24 24" width={size}>
      <rect fill="currentColor" height="18" rx="2.2" width="4.4" x="3.6" y="3" />
      <rect fill="currentColor" height="18" rx="2.2" width="4.4" x="16" y="3" />
      <rect className="mark-dot" height="5.2" rx="1.4" width="5.2" x="9.4" y="9.4" />
    </svg>
  )
}
