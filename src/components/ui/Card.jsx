import React from 'react';

export default function Card({ title, children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-sk-card-border bg-sk-card p-5 shadow-sm ${className}`}
    >
      {title && (
        <h2 className="font-serif text-lg tracking-wide text-sk-ink mb-4">{title}</h2>
      )}
      {children}
    </section>
  );
}
