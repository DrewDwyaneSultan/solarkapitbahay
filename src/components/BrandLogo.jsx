import React from 'react';

const LOGO_SRC = '/logosolarkapitbahay.png';

/** Project logo — public/logosolarkapitbahay.png */
export default function BrandLogo({
  className = 'h-12 w-auto',
  circleBg = false,
  /** Circle diameter in px (inline style — Tailwind cannot see dynamic `size-*` props). */
  circleBgSize = 112,
  alt = 'Solar KapitBahay',
}) {
  if (!circleBg) {
    return (
      <img
        src={LOGO_SRC}
        alt={alt}
        className={`object-contain ${className}`}
        decoding="async"
      />
    );
  }

  return (
    <div
      style={{ width: circleBgSize, height: circleBgSize }}
      className={`shrink-0 rounded-full bg-white flex items-center justify-center overflow-hidden ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt={alt}
        style={{ width: '72%', height: '72%' }}
        className="object-contain"
        decoding="async"
      />
    </div>
  );
}

export { LOGO_SRC };
