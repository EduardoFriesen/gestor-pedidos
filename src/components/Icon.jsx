import React from 'react'

const PATHS = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11h13V9" />
      <path d="M10 20v-5.5h4V20" />
    </>
  ),
  pot: (
    <>
      <path d="M3 11h18" />
      <path d="M5 11v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6" />
      <path d="M9 3.5c-.8 1 .8 2-.1 3.5" />
      <path d="M14.5 3.5c-.8 1 .8 2-.1 3.5" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h3" />
    </>
  ),
  utensils: (
    <>
      <path d="M4 3v5a3 3 0 0 0 6 0V3" />
      <path d="M7 3v18" />
      <path d="M19 21V3c-2.5 1.5-4 4.5-4 8.5h4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 20c-.5-9 5-15 15-15 .5 10-5.5 15.5-14 15" />
      <path d="M5 20c3-5 6-8 10-10" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 14.2c2 .9 3.5 3.1 3.5 5.8" />
    </>
  ),
  chart: (
    <>
      <path d="M3 20.5h18" />
      <path d="M6 20.5v-6" />
      <path d="M12 20.5v-14" />
      <path d="M18 20.5v-9" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h9" /><path d="M19 6h1" /><circle cx="16" cy="6" r="2.2" />
      <path d="M4 12h3" /><path d="M13 12h7" /><circle cx="10" cy="12" r="2.2" />
      <path d="M4 18h11" /><circle cx="18" cy="18" r="2.2" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
    </>
  )
}

export default function Icon({ name, className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
