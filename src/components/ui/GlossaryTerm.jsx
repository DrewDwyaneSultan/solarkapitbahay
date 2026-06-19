import React from 'react';
import { GLOSSARY } from '../../constants/glossary';

/**
 * Inline term with hover explanation. Use for jargon (Gini, SOC, etc.).
 * @param {string} id - key in GLOSSARY
 * @param {React.ReactNode} [children] - display text (defaults to glossary label)
 */
export default function GlossaryTerm({ id, children, className = '' }) {
  const entry = GLOSSARY[id];
  if (!entry) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span className={`relative inline group/gloss ${className}`}>
      <span className="cursor-help border-b border-dotted border-sk-accent/70 text-inherit">
        {children ?? entry.label}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg border border-sk-card-border/40 bg-sk-ink px-3 py-2 text-left text-xs font-normal normal-case tracking-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/gloss:opacity-100"
      >
        {entry.text}
      </span>
    </span>
  );
}
