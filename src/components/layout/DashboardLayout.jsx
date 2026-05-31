import React from 'react';
import MainHeader from './MainHeader';
import Sidebar from './Sidebar';

export default function DashboardLayout({
  activePage,
  onNavigate,
  operator,
  barangayName,
  headerSubtitle,
  children,
}) {
  return (
    <div className="flex min-h-screen bg-sk-canvas font-sans text-sk-ink">
      <Sidebar activePage={activePage} onNavigate={onNavigate} operator={operator} />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-6 py-6 md:px-8 md:py-8">
          <MainHeader barangayName={barangayName} subtitle={headerSubtitle} />
          {children}
        </div>
      </main>
    </div>
  );
}
