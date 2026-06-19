import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Toast from '../components/ui/Toast';
import LiveStatusBadge from '../components/ui/LiveStatusBadge';
import { BatteryActionChip } from '../components/clustering/BatteryActionIndicator';
import { useClustering } from '../hooks/useClustering';
import { useLiveData } from '../hooks/useLiveData';
import { CIRCUIT_HOUSES, resolveCircuit } from '../constants/circuits';
import {
  approveRegistration,
  createHousehold,
  deleteHousehold,
  fetchHouseholdsByBarangay,
  fetchRegistrations,
  rejectRegistration,
  resetMockHouseholds,
  updateHousehold,
} from '../services/registrationApi';

export default function HouseholdsPage({ accessToken, barangayCode }) {
  const { data: clusterData, reload: reloadClustering } = useClustering();
  const liveData = useLiveData();
  const actionById = useMemo(() => {
    const map = {};
    (clusterData?.households ?? []).forEach((h) => {
      map[h.household_id] = h;
    });
    return map;
  }, [clusterData]);

  const [rows, setRows] = useState([]);
  const [regs, setRegs] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedReg, setSelectedReg] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [addForm, setAddForm] = useState({
    headName: '',
    address: '',
    purok: '',
    hasSolar: false,
    hasBattery: false,
  });
  const [editForm, setEditForm] = useState({
    headName: '',
    address: '',
    purok: '',
    hasSolar: false,
    hasBattery: false,
    status: 'active',
    clusterAction: 'auto',
  });

  const loadData = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const [hhRows, regData] = await Promise.all([
        barangayCode
          ? fetchHouseholdsByBarangay(barangayCode, { claimableOnly: false })
          : Promise.resolve([]),
        fetchRegistrations(accessToken, 'pending'),
      ]);
      setRows(
        hhRows.map((r) => ({
          id: r.id,
          headName: r.head_name,
          address: r.address ?? r.purok ?? '—',
          purok: r.purok ?? '',
          hasSolar: r.has_solar,
          hasBattery: r.has_battery,
          status: r.status ?? 'active',
          householdCode: r.household_code,
          clusterAction: r.cluster_action ?? 'auto',
        })),
      );
      setRegs(
        (regData.registrations ?? []).map((r) => ({
          id: r.id,
          name: r.display_name,
          address: r.address ?? '—',
          hasSolar: r.has_solar,
          hasBattery: r.has_battery,
          email: r.applicant_email,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken, barangayCode]);

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
  const selectedLive = selected ? liveData[resolveCircuit(selected.id).key] : null;

  const liveByHouseholdId = useMemo(() => {
    const map = {};
    for (const c of CIRCUIT_HOUSES) {
      map[c.id] = liveData[c.key];
    }
    return map;
  }, [liveData]);

  const notify = (message, tone = 'success') => setToast({ message, tone });

  const refreshAll = async () => {
    await loadData();
    reloadClustering();
  };

  const openEdit = (row) => {
    setSelectedId(row.id);
    setSelectedReg(null);
    setShowEditForm(true);
    setEditForm({
      headName: row.headName,
      address: row.address === '—' ? '' : row.address,
      purok: row.purok || '',
      hasSolar: row.hasSolar,
      hasBattery: row.hasBattery,
      status: row.status,
      clusterAction: row.clusterAction ?? actionById[row.id]?.action ?? 'auto',
    });
  };

  const submitEditHousehold = async (e) => {
    e.preventDefault();
    if (!accessToken || !selectedId || !editForm.headName.trim()) return;
    setBusy(true);
    try {
      await updateHousehold(accessToken, selectedId, {
        head_name: editForm.headName.trim(),
        address: editForm.address.trim() || null,
        purok: editForm.purok.trim() || null,
        has_solar: editForm.hasSolar,
        has_battery: editForm.hasBattery,
        status: editForm.status,
        cluster_action: editForm.clusterAction,
      });
      setShowEditForm(false);
      notify(`Updated ${editForm.headName.trim()}. Clustering refreshed.`);
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Could not update household.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteHousehold = async (row) => {
    if (!accessToken || !row) return;
    const ok = window.confirm(
      `Delete ${row.headName} (${row.id})? This removes mock energy data and unlinks any claimed accounts.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteHousehold(accessToken, row.id);
      if (selectedId === row.id) {
        setSelectedId(null);
        setShowEditForm(false);
      }
      notify(`Deleted ${row.id}.`, 'error');
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Could not delete household.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const runResetMockData = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const result = await resetMockHouseholds(accessToken);
      setShowResetConfirm(false);
      setSelectedId(null);
      setShowEditForm(false);
      notify(
        `Restored ${result.households ?? 15} mock households. Operator-added homes were removed.`,
      );
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Reset failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const approveReg = async (reg) => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await approveRegistration(accessToken, reg.id);
      setSelectedReg(null);
      notify(`Approved registration for ${reg.name}.`);
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Approve failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const rejectReg = async (reg) => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await rejectRegistration(accessToken, reg.id, rejectReason);
      setSelectedReg(null);
      setRejectReason('');
      notify(`Rejected registration for ${reg.name}.`, 'error');
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Reject failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const submitAddHousehold = async (e) => {
    e.preventDefault();
    if (!accessToken || !addForm.headName.trim()) return;
    setBusy(true);
    try {
      const created = await createHousehold(accessToken, {
        head_name: addForm.headName.trim(),
        address: addForm.address.trim() || null,
        purok: addForm.purok.trim() || null,
        has_solar: addForm.hasSolar,
        has_battery: addForm.hasBattery,
      });
      setAddForm({ headName: '', address: '', purok: '', hasSolar: false, hasBattery: false });
      setShowAddForm(false);
      notify(`Added ${created.head_name ?? addForm.headName} (${created.id}). Clustering updated.`);
      await refreshAll();
    } catch (err) {
      notify(err.message ?? 'Could not add household.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!accessToken) {
    return (
      <div className="space-y-4">
        <LiveStatusBadge data={liveData} />
        <Card title="Live Circuits (Hardware)">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CIRCUIT_HOUSES.map((c) => {
              const h = liveData[c.key];
              return (
                <div key={c.id} className="rounded-xl border border-sk-card-border/40 bg-white/60 p-4">
                  <p className="font-semibold">{c.name} · {c.id}</p>
                  <p className="text-xs font-mono text-sk-ink-muted mt-2">
                    {h?.online ? h.status : 'Offline'} · {h?.voltage?.toFixed?.(1) ?? '—'} V
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Households">
          <p className="text-sm text-sk-ink-muted">Sign in with Supabase to manage registrations and household records.</p>
        </Card>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} tone={toast.tone} onDone={() => setToast(null)} />}

      {barangayCode && (
        <p className="text-xs text-sk-ink-muted mb-4">
          Barangay code: <strong className="font-mono">{barangayCode}</strong> — share with households
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LiveStatusBadge data={liveData} />
        <p className="text-xs text-sk-ink-muted">HH-01 = House A · HH-02 = House B (live ESP32)</p>
      </div>

      <Card title="Live Circuits (Hardware)" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CIRCUIT_HOUSES.map((c) => {
            const h = liveData[c.key];
            return (
              <div key={c.id} className="rounded-xl border border-sk-card-border/40 bg-white/60 p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs font-mono text-sk-ink-muted">{c.id}</p>
                  </div>
                  <LiveCircuitPill online={h?.online} status={h?.status} />
                </div>
                <p className="text-xs font-mono text-sk-ink-muted">
                  {h?.voltage?.toFixed?.(1) ?? '—'} V · {h?.current?.toFixed?.(2) ?? '—'} A · {h?.solar ?? 0} W
                </p>
                <p className="text-xs text-sk-ink-muted mt-1">
                  Transfer: {h?.transfer ?? '—'} · Relay:{' '}
                  {!h?.online ? '—' : h?.relay ? 'ON' : 'OFF'}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Add Household" className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <p className="text-xs text-sk-ink-muted max-w-2xl">
            Manually register a home in your barangay. New homes get mock 24 h energy profiles
            automatically so they appear on the Battery Clustering chart (charge / discharge /
            balanced).
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => setShowResetConfirm(true)}
            className="h-9 px-3 rounded-lg border border-rose-300 bg-rose-50 text-rose-900 text-xs font-semibold shrink-0 hover:bg-rose-100 disabled:opacity-50"
          >
            Reset mock data
          </button>
        </div>
        {showResetConfirm && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50/80 p-4">
            <p className="text-sm text-rose-950 font-semibold mb-1">Restore original 15 households?</p>
            <p className="text-xs text-rose-900 mb-3">
              This removes all operator-added homes and restores the default mock dataset. Linked
              user accounts are unlinked but not deleted.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={runResetMockData}
                className="h-9 px-4 rounded-lg bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                Yes, reset
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowResetConfirm(false)}
                className="h-9 px-4 rounded-lg border border-rose-300 bg-white text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="h-10 px-4 rounded-lg bg-sk-accent text-white text-sm font-semibold hover:opacity-90"
          >
            + Add household
          </button>
        ) : (
          <form onSubmit={submitAddHousehold} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                Head of household *
              </label>
              <input
                required
                value={addForm.headName}
                onChange={(e) => setAddForm((f) => ({ ...f, headName: e.target.value }))}
                className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                placeholder="e.g. Maria Santos"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                Purok / zone
              </label>
              <input
                value={addForm.purok}
                onChange={(e) => setAddForm((f) => ({ ...f, purok: e.target.value }))}
                className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                placeholder="Purok 3"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                Address
              </label>
              <input
                value={addForm.address}
                onChange={(e) => setAddForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                placeholder="Street / sitio"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addForm.hasSolar}
                onChange={(e) => setAddForm((f) => ({ ...f, hasSolar: e.target.checked }))}
              />
              Has solar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addForm.hasBattery}
                onChange={(e) => setAddForm((f) => ({ ...f, hasBattery: e.target.checked }))}
              />
              Has battery
            </label>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-lg bg-sk-accent text-white text-sm font-semibold disabled:opacity-50"
              >
                Save household
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowAddForm(false)}
                className="h-10 px-4 rounded-lg border border-sk-card-border/60 bg-white text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6">
        <Card title="Households Overview">
          {loading && <p className="text-sm text-sk-ink-muted mb-3">Loading…</p>}
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
                  <th className="text-left py-2">Code</th>
                  <th className="text-left py-2">Solar</th>
                  <th className="text-left py-2">Battery</th>
                  <th className="text-left py-2">Live</th>
                  <th className="text-left py-2">Cluster</th>
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
                    <td className="py-3 text-xs font-mono">{r.householdCode ?? '—'}</td>
                    <td className="py-3">
                      <YesNoChip yes={r.hasSolar} />
                    </td>
                    <td className="py-3">
                      <YesNoChip yes={r.hasBattery} />
                    </td>
                    <td className="py-3">
                      {liveByHouseholdId[r.id] ? (
                        <LiveCircuitPill
                          online={liveByHouseholdId[r.id].online}
                          status={liveByHouseholdId[r.id].status}
                        />
                      ) : (
                        <span className="text-xs text-sk-ink-muted">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      {actionById[r.id] ? (
                        <BatteryActionChip
                          action={actionById[r.id].action}
                          label={actionById[r.id].action_label}
                        />
                      ) : (
                        <span className="text-xs text-amber-800" title="Edit & save to generate mock energy profile">
                          No profile
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <StatusChip status={r.status} />
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-1">
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
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="h-8 px-3 rounded-md border border-sk-card-border/60 bg-white text-xs font-semibold hover:bg-sky-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => confirmDeleteHousehold(r)}
                          className="h-8 px-3 rounded-md border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Approve / Reject">
            <p className="text-xs text-sk-ink-muted mb-3">
              New household sign-ups appear here. Rejected applicants receive an email when configured.
            </p>
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
                  <p className="text-[10px] uppercase tracking-widest text-sk-ink-muted">{r.email}</p>
                </button>
              ))}
              {regs.length === 0 && !loading && (
                <p className="text-sm text-sk-ink-muted">No pending registrations.</p>
              )}
            </div>
            {regDetail && (
              <div className="mb-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1">
                  Rejection reason (optional)
                </label>
                <input
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Address not in this barangay"
                  className="w-full h-9 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!regDetail || busy}
                onClick={() => regDetail && approveReg(regDetail)}
                className="h-10 rounded-md bg-sk-run text-white text-sm font-semibold disabled:opacity-40"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!regDetail || busy}
                onClick={() => regDetail && rejectReg(regDetail)}
                className="h-10 rounded-md border border-rose-300 bg-rose-50 text-rose-900 text-sm font-semibold disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </Card>

          <Card title="Household Details">
            {showEditForm && selected ? (
              <form onSubmit={submitEditHousehold} className="space-y-3">
                <p className="text-xs text-sk-ink-muted mb-2">
                  Editing <strong className="font-mono">{selected.id}</strong> — mock energy profile
                  regenerates on save.
                </p>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                    Head of household *
                  </label>
                  <input
                    required
                    value={editForm.headName}
                    onChange={(e) => setEditForm((f) => ({ ...f, headName: e.target.value }))}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                    Purok / zone
                  </label>
                  <input
                    value={editForm.purok}
                    onChange={(e) => setEditForm((f) => ({ ...f, purok: e.target.value }))}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                    Address
                  </label>
                  <input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.hasSolar}
                    onChange={(e) => setEditForm((f) => ({ ...f, hasSolar: e.target.checked }))}
                  />
                  Has solar
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editForm.hasBattery}
                    onChange={(e) => setEditForm((f) => ({ ...f, hasBattery: e.target.checked }))}
                  />
                  Has battery
                </label>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                    Battery cluster action
                  </label>
                  <select
                    value={editForm.clusterAction}
                    onChange={(e) => setEditForm((f) => ({ ...f, clusterAction: e.target.value }))}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                  >
                    <option value="auto">Auto (K-means from mock energy data)</option>
                    <option value="charge">Charge</option>
                    <option value="discharge">Discharge</option>
                    <option value="balanced">Balanced</option>
                  </select>
                  <p className="text-[11px] text-sk-ink-muted mt-1">
                    Manual override appears on the Dashboard clustering chart and household table.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-sk-ink-muted mb-1.5">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full h-10 rounded-md border border-sk-card-border/60 bg-white px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={busy}
                    className="h-10 px-4 rounded-lg bg-sk-accent text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowEditForm(false)}
                    className="h-10 px-4 rounded-lg border border-sk-card-border/60 bg-white text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : selected ? (
              <dl className="space-y-3 text-sm">
                <DetailRow label="HH ID" value={selected.id} />
                <DetailRow label="Head" value={selected.headName} />
                <DetailRow label="Address" value={selected.address} />
                <DetailRow label="Household code" value={selected.householdCode ?? '—'} />
                <DetailRow label="Solar" value={selected.hasSolar ? 'Yes' : 'No'} />
                <DetailRow label="Battery" value={selected.hasBattery ? 'Yes' : 'No'} />
                <DetailRow label="Status" value={selected.status} />
                {selectedLive && (
                  <>
                    <DetailRow label="Live circuit" value={resolveCircuit(selected.id).name} />
                    <DetailRow
                      label="MQTT"
                      value={selectedLive.online ? 'Online' : 'Offline'}
                    />
                    <DetailRow label="Solar status" value={selectedLive.status} />
                    <DetailRow
                      label="Panel"
                      value={`${selectedLive.voltage?.toFixed?.(1) ?? '—'} V · ${selectedLive.current?.toFixed?.(2) ?? '—'} A`}
                    />
                    <DetailRow label="Transfer" value={selectedLive.transfer} />
                    <DetailRow
                      label="Relay"
                      value={!selectedLive.online ? '—' : selectedLive.relay ? 'ON' : 'OFF'}
                    />
                  </>
                )}
                {actionById[selected.id] && (
                  <>
                    <DetailRow label="Cluster action" value={actionById[selected.id].action_label} />
                    <DetailRow
                      label="Net load (avg)"
                      value={`${actionById[selected.id].net_load_kwh} kWh`}
                    />
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="h-9 px-3 rounded-lg border border-sk-card-border/60 bg-white text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => confirmDeleteHousehold(selected)}
                    className="h-9 px-3 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-900 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </dl>
            ) : regDetail ? (
              <dl className="space-y-3 text-sm">
                <DetailRow label="Applicant" value={regDetail.name} />
                <DetailRow label="Email" value={regDetail.email} />
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

function LiveCircuitPill({ online, status }) {
  const sur = String(status || '').toUpperCase() === 'SURPLUS';
  return (
    <span
      className={`inline-flex h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
        !online
          ? 'bg-stone-100 text-stone-700 border-stone-200'
          : sur
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-amber-50 text-amber-900 border-amber-200'
      }`}
    >
      {!online ? 'Offline' : status || '—'}
    </span>
  );
}
