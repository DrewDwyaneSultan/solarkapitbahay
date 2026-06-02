import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import { householdRows } from '../constants/mockSimulation';

const pendingRegs = [
  { id: 'REG-014', name: 'Linda S.', address: 'Purok 3', hasSolar: true, hasBattery: false },
  { id: 'REG-015', name: 'Jun P.', address: 'Purok 4', hasSolar: false, hasBattery: true },
  { id: 'REG-016', name: 'Mina T.', address: 'Purok 2', hasSolar: true, hasBattery: true },
];

export default function HouseholdsPage() {
  const [rows, setRows] = useState(householdRows);
  const [regs, setRegs] = useState(pendingRegs);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReg, setSelectedReg] = useState(null);
  const [toast, setToast] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (statusFilter === 'all' ? true : r.status === statusFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          r.id.toLowerCase().includes(q) ||
          r.headName.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
        );
      });
  }, [rows, query, statusFilter]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const regDetail = regs.find((r) => r.id === selectedReg) ?? null;

  const notify = (message, tone = 'success') => setToast({ message, tone });

  const approveReg = (reg) => {
    setRegs((list) => list.filter((r) => r.id !== reg.id));
    setRows((list) => [
      ...list,
      {
        id: `HH-${String(list.length + 1).padStart(2, '0')}`,
        headName: reg.name,
        address: reg.address,
        hasSolar: reg.hasSolar,
        hasBattery: reg.hasBattery,
        status: 'active',
      },
    ]);
    setSelectedReg(null);
    notify(`Approved registration for ${reg.name}.`);
  };

  const rejectReg = (reg) => {
    setRegs((list) => list.filter((r) => r.id !== reg.id));
    setSelectedReg(null);
    notify(`Rejected registration for ${reg.name}.`, 'error');
  };

  return (
    <>
      {toast && <Toast message={toast.message} tone={toast.tone} onDone={() => setToast(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <Card title="Households Overview">
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                Search
              </label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search HH ID, name, or address…"
                className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
              />
            </div>
            <div className="w-full md:w-52">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
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
                  <th className="text-left py-2">HH ID</th>
                  <th className="text-left py-2">Head</th>
                  <th className="text-left py-2">Address</th>
                  <th className="text-left py-2">Solar</th>
                  <th className="text-left py-2">Battery</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-right py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sk-card-border/25">
                {filtered.map((r) => (
                  <tr key={r.id} className={selectedId === r.id ? 'bg-emerald-50/50' : ''}>
                    <td className="py-3 font-semibold">{r.id}</td>
                    <td className="py-3">{r.headName}</td>
                    <td className="py-3">{r.address}</td>
                    <td className="py-3">
                      <YesNoChip yes={r.hasSolar} />
                    </td>
                    <td className="py-3">
                      <YesNoChip yes={r.hasBattery} />
                    </td>
                    <td className="py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(r.id);
                          setSelectedReg(null);
                        }}
                        className="h-8 px-3 rounded-md border border-sk-card-border/60 bg-white text-xs font-semibold hover:bg-sk-accent/10 hover:border-sk-accent"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Approve / Reject">
            <p className="text-xs text-sk-ink-muted mb-3">Select a pending registration below, then approve or reject.</p>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {regs.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedReg(r.id);
                    setSelectedId(null);
                  }}
                  className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    selectedReg === r.id ? 'border-sk-accent bg-amber-50' : 'border-sk-card-border/40 bg-white/60'
                  }`}
                >
                  <p className="text-sm font-semibold">{r.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-sk-ink-muted">{r.id}</p>
                </button>
              ))}
              {regs.length === 0 && <p className="text-sm text-sk-ink-muted">No pending registrations.</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!regDetail}
                onClick={() => regDetail && approveReg(regDetail)}
                className="h-10 rounded-md bg-sk-run text-white text-sm font-semibold disabled:opacity-40"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!regDetail}
                onClick={() => regDetail && rejectReg(regDetail)}
                className="h-10 rounded-md border border-rose-300 bg-rose-50 text-rose-900 text-sm font-semibold disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </Card>

          <Card title="Household Details">
            {selected ? (
              <dl className="space-y-3 text-sm">
                <DetailRow label="HH ID" value={selected.id} />
                <DetailRow label="Head" value={selected.headName} />
                <DetailRow label="Address" value={selected.address} />
                <DetailRow label="Solar" value={selected.hasSolar ? 'Yes' : 'No'} />
                <DetailRow label="Battery" value={selected.hasBattery ? 'Yes' : 'No'} />
                <DetailRow label="Status" value={selected.status} />
                <p className="text-xs text-sk-ink-muted pt-2 border-t border-sk-card-border/30">
                  Last simulation share: 78% · Grid draw reduced 12% this week (demo).
                </p>
              </dl>
            ) : regDetail ? (
              <dl className="space-y-3 text-sm">
                <DetailRow label="Registration" value={regDetail.id} />
                <DetailRow label="Name" value={regDetail.name} />
                <DetailRow label="Address" value={regDetail.address} />
                <DetailRow label="Solar" value={regDetail.hasSolar ? 'Yes' : 'No'} />
                <DetailRow label="Battery" value={regDetail.hasBattery ? 'Yes' : 'No'} />
              </dl>
            ) : (
              <p className="text-sm text-sk-ink-muted py-6 text-center">
                Click <strong>View</strong> on a household or select a pending registration.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 rounded-lg bg-white/50 px-3 py-2 border border-sk-card-border/20">
      <dt className="text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted">{label}</dt>
      <dd className="font-semibold text-right capitalize">{value}</dd>
    </div>
  );
}

function YesNoChip({ yes }) {
  return (
    <span
      className={`inline-flex h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
        yes ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'
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
    <span className={`inline-flex h-7 px-2.5 rounded-full text-[11px] font-semibold border ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  );
}
