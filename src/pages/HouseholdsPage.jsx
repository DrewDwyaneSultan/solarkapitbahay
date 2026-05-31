import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import PlaceholderSlot from '../components/ui/PlaceholderSlot';
import { householdRows } from '../constants/mockSimulation';

export default function HouseholdsPage() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return householdRows
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.headName.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
        );
      });
  }, [query, statusFilter]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
      <Card title="Households">
        <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
              Search
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search HH ID, name, or address…"
              className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink placeholder:text-sk-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-sk-run/25"
            />
          </div>
          <div className="w-full md:w-52">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm text-sk-ink focus:outline-none focus:ring-2 focus:ring-sk-run/25"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-sk-ink-muted">
                <th className="text-left font-bold py-2 pr-3">HH ID</th>
                <th className="text-left font-bold py-2 pr-3">Head</th>
                <th className="text-left font-bold py-2 pr-3">Address</th>
                <th className="text-left font-bold py-2 pr-3">Solar</th>
                <th className="text-left font-bold py-2 pr-3">Battery</th>
                <th className="text-left font-bold py-2 pr-3">Status</th>
                <th className="text-right font-bold py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sk-card-border/25">
              {rows.map((r) => (
                <tr key={r.id} className="align-middle">
                  <td className="py-3 pr-3 font-semibold text-sk-ink">{r.id}</td>
                  <td className="py-3 pr-3 text-sk-ink">{r.headName}</td>
                  <td className="py-3 pr-3 text-sk-ink">{r.address}</td>
                  <td className="py-3 pr-3">
                    <YesNoChip yes={r.hasSolar} />
                  </td>
                  <td className="py-3 pr-3">
                    <YesNoChip yes={r.hasBattery} />
                  </td>
                  <td className="py-3 pr-3">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      className="h-8 px-3 rounded-md border border-sk-card-border/60 bg-white text-xs font-semibold text-sk-ink hover:bg-sk-placeholder/40 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sk-ink-muted">
                    No households matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="New Registrations">
          <div className="space-y-3">
            <RegistrationRow id="REG-014" name="Linda S." meta="Pending review" />
            <RegistrationRow id="REG-015" name="Jun P." meta="Pending documents" />
            <RegistrationRow id="REG-016" name="Mina T." meta="Pending review" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-10 rounded-md bg-sk-run text-white text-sm font-semibold hover:bg-sk-run-hover transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              className="h-10 rounded-md border border-sk-card-border/70 bg-white text-sm font-semibold text-sk-ink hover:bg-sk-placeholder/40 transition-colors"
            >
              Reject
            </button>
          </div>
        </Card>

        <Card title="Household Details">
          <div className="grid grid-cols-2 gap-3">
            <PlaceholderSlot variant="box" label="Detail slot 1" />
            <PlaceholderSlot variant="box" label="Detail slot 2" />
          </div>
          <div className="mt-3 space-y-2">
            <PlaceholderSlot variant="pill" label="Detail pill 1" />
            <PlaceholderSlot variant="pill" label="Detail pill 2" />
            <PlaceholderSlot variant="pill" label="Detail pill 3" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RegistrationRow({ id, name, meta }) {
  return (
    <div className="rounded-xl border border-sk-card-border/40 bg-white/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-sk-ink">{name}</p>
          <p className="text-[10px] uppercase tracking-widest text-sk-ink-muted mt-0.5">
            {id} · {meta}
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-sk-accent">
          Pending
        </span>
      </div>
    </div>
  );
}

function YesNoChip({ yes }) {
  return (
    <span
      className={`inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
        yes
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
          : 'bg-rose-50 text-rose-900 border-rose-200'
      }`}
    >
      {yes ? 'Yes' : 'No'}
    </span>
  );
}

function StatusChip({ status }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    pending: 'bg-amber-50 text-amber-900 border-amber-200',
    inactive: 'bg-stone-100 text-stone-900 border-stone-200',
  };

  return (
    <span
      className={`inline-flex items-center justify-center h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
        map[status] ?? 'bg-stone-100 text-stone-900 border-stone-200'
      }`}
    >
      {status}
    </span>
  );
}

