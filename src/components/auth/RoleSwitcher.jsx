import React from 'react';

export default function RoleSwitcher({ roles, activeRole, onSwitch, variant = 'sidebar' }) {
  const hasBoth =
    Array.isArray(roles) && roles.includes('operator') && roles.includes('household');
  if (!hasBoth || !onSwitch) return null;

  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={
        isSidebar
          ? 'mx-3 mb-3 rounded-xl border border-white/15 bg-white/5 p-1'
          : 'rounded-lg border border-black/10 bg-white/70 p-1 inline-flex'
      }
    >
      <button
        type="button"
        onClick={() => onSwitch('operator')}
        className={`flex-1 px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-colors ${
          activeRole === 'operator'
            ? isSidebar
              ? 'bg-white text-sk-sidebar shadow-sm'
              : 'bg-[#6b5a3d] text-white'
            : isSidebar
              ? 'text-white/70 hover:text-white'
              : 'text-black/55 hover:text-black/80'
        }`}
      >
        Operator
      </button>
      <button
        type="button"
        onClick={() => onSwitch('household')}
        className={`flex-1 px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-colors ${
          activeRole === 'household'
            ? isSidebar
              ? 'bg-white text-sk-sidebar shadow-sm'
              : 'bg-[#6b5a3d] text-white'
            : isSidebar
              ? 'text-white/70 hover:text-white'
              : 'text-black/55 hover:text-black/80'
        }`}
      >
        Household
      </button>
    </div>
  );
}
