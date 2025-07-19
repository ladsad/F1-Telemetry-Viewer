import React from "react"

export function FlagIcon({ color = "#fff", ...props }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" fill={color} />
      <path d="M2 4l20 16" stroke="#111" strokeWidth="2" />
    </svg>
  )
}

export function SteeringWheelIcon({ color = "#fff", ...props }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <rect x="7" y="10" width="10" height="4" rx="2" fill={color} />
    </svg>
  )
}

export function SpeedometerIcon({ color = "#fff", ...props }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <path d="M12 12l4-4" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
    );
}

export function TireIcon({ color = "#fff", ...props }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
            <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
            <circle cx="12" cy="12" r="2" fill={color} />
        </svg>
    );
}

export function HelmetIcon({ color = "#fff", ...props }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
            <ellipse cx="12" cy="14" rx="8" ry="6" stroke={color} strokeWidth="2" />
            <path d="M4 14c0-5 16-5 16 0" stroke={color} strokeWidth="2" />
            <rect x="8" y="12" width="8" height="2" rx="1" fill={color} />
        </svg>
    );
}

export function ERSIcon({ color = "#fff", ...props }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="2" />
        </svg>
    );
}

export function PitIcon({ color = "#fff", ...props }) {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M4 18h16" stroke={color} strokeWidth="2" />
            <path d="M4 18v-8h16v8" stroke={color} strokeWidth="2" />
            <path d="M9 18v-4h6v4" stroke={color} strokeWidth="2" />
        </svg>
    );
}