import React from 'react';
import BrandLogo from '../BrandLogo';
import { navItems } from '../../constants/mockSimulation';
import { NavIcon } from '../icons/NavIcons';

function NavGroup({ title, items, activeId, onNavigate }) {
  return (
    <div className="mt-6">
      <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sk-sidebar-active text-white shadow-inner border-l-[3px] border-sk-accent pl-[9px]'
                    : 'text-white/75 hover:bg-white/10 hover:text-white border-l-[3px] border-transparent'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Sidebar({ activePage, onNavigate, operator, onLogout }) {
  const initials = operator?.initials ?? 'JU';
  const name = operator?.name ?? 'Juan Ulbenario';
  const role = operator?.role ?? 'Barangay Operator';

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-sk-sidebar text-white min-h-screen">
      <div className="flex justify-center items-center px-5 pt-6 pb-5 border-b border-sk-sidebar-border/50">
        <BrandLogo circleBg circleBgSize={140} />
      </div>

      <div className="px-4 py-5 flex items-center gap-3 border-b border-sk-sidebar-border/40">
        <div
          className="w-11 h-11 rounded-lg bg-emerald-700 flex items-center justify-center text-sm font-bold tracking-wide"
          aria-hidden
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          <p className="text-[9px] uppercase tracking-widest text-white/50 mt-0.5">
            {role}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <NavGroup
          title="Overview"
          items={navItems.overview}
          activeId={activePage}
          onNavigate={onNavigate}
        />
        <NavGroup
          title="Operator"
          items={navItems.operator}
          activeId={activePage}
          onNavigate={onNavigate}
        />
      </nav>

      <div className="px-3 py-4 border-t border-sk-sidebar-border/40">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
