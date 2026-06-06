import React from 'react';
import BrandLogo from '../../components/BrandLogo';
import { NavIcon } from '../../components/icons/NavIcons';
import { householdMemberNav } from '../../constants/mockSimulation';

export default function HouseholdLayout({
  activePage,
  onNavigate,
  barangayName = 'Barangay Name',
  householdCode = 'household_code',
  memberName = 'User',
  children,
}) {
  return (
    <div className="min-h-screen bg-[#E9E4D7] text-[#2c1f1a] font-sans">
      <header className="px-6 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white p-1.5 border border-black/10 shadow-sm">
              <BrandLogo className="h-14 w-auto" />
            </div>
            <div>
              <p className="text-sm text-black/70 mt-0.5">{barangayName}</p>
              <p className="text-[11px] uppercase tracking-widest text-black/55">
                {householdCode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-black/70">{memberName}</p>
              <p className="text-[10px] uppercase tracking-widest text-black/45">
                More information
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#6b3f2b] text-white flex items-center justify-center font-bold">
              {String(memberName).slice(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 pb-8 pt-4 grid grid-cols-1 lg:grid-cols-[110px_minmax(0,1fr)] gap-6">
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="w-[110px] rounded-2xl bg-white/55 border border-black/10 shadow-sm px-3 py-4">
            <div className="space-y-4">
              {householdMemberNav.map((item) => {
                const active = item.id === activePage;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    className="w-full flex flex-col items-center gap-2"
                    aria-current={active ? 'page' : undefined}
                  >
                    <span
                      className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${
                        active
                          ? 'bg-[#6b5a3d] border-[#6b5a3d] text-white'
                          : 'bg-[#b9a88a] border-black/10 text-white/90 hover:bg-[#a69476]'
                      }`}
                      aria-hidden
                    >
                      <NavIcon name={item.icon} />
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-black/60 text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

