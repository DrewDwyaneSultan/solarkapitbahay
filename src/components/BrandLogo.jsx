import React from 'react';

const LOGO_SRC = '/logosolarkapitbahay.png';

/** Project logo — public/logosolarkapitbahay.png */
export default function BrandLogo({
  className = 'h-12 w-auto',
  alt = 'Solar KapitBahay',
}) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      className={`object-contain ${className}`}
      decoding="async"
    />
  );
}

export { LOGO_SRC };
