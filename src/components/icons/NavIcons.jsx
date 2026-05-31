import React from 'react';

const iconClass = 'w-5 h-5 shrink-0';

export function NavIcon({ name }) {
  switch (name) {
    case 'grid':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'play':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v13.72a1 1 0 001.52.85l10.26-6.86a1 1 0 000-1.7L9.52 4.29A1 1 0 008 5.14z" />
        </svg>
      );
    case 'house':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2a6 6 0 00-6 6v3.1l-1.4 2.8a1 1 0 00.9 1.5h13a1 1 0 00.9-1.5L18 11.1V8a6 6 0 00-6-6zm0 20a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'zap':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'battery':
      return (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="8" width="16" height="10" rx="2" />
          <path d="M21 10v6" />
        </svg>
      );
    default:
      return null;
  }
}

export function SunLogoIcon({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zm0-10c.41 0 .75-.34.75-.75V3c0-.41-.34-.75-.75-.75s-.75.34-.75.75v1.25c0 .41.34.75.75.75zm0 14c-.41 0-.75.34-.75.75V21c0 .41.34.75.75.75s.75-.34.75-.75v-1.25c0-.41-.34-.75-.75-.75zm8.25-7.25h-1.25c-.41 0-.75.34-.75.75s.34.75.75.75h1.25c.41 0 .75-.34.75-.75s-.34-.75-.75-.75zM5 12c0-.41-.34-.75-.75-.75H3c-.41 0-.75.34-.75.75s.34.75.75.75h1.25c.41 0 .75-.34.75-.75z" />
    </svg>
  );
}
