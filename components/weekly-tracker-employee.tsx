'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getCurrentWeekInfo, getWeekRange } from '@/lib/week-utils';

const EMPTY_GOAL = { target: 0, actual: 0, notes: '' };
const EMPTY_FORM = {
  g1: { ...EMPTY_GOAL },
  g2: { ...EMPTY_GOAL },
  g3: { ...EMPTY_GOAL },
  g4: { ...EMPTY_GOAL },
  glTours: { target: 0, actual: 0, locations: '' },
  initial: '',
  onIt: '',
  impact: '',
  notes: '',
  issues: '',
};

export default function WeeklyTrackerEmployee() {
  const now = useMemo(() => getCurrentWeekInfo(), []);
  const [year, setYear] = useState(now.year);
  const [weekNumber, setWeekNumber] = useState(now.weekNumber);
  const [weekRange, setWeekRange] = useState(getWeekRange(now.year, now.weekNumber));
  const [labels, setLabels] = useState({ g1: 'G1', g2: 'G2', g3: 'G3', g4: 'G4', glTours: 'GL Tours' });
  const [tracker, setTracker] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openGoals, setOpenGoals] = useState(true);
  const [openGL, setOpenGL] = useState(true);
  const [openWrap, setOpenWrap] = useState(true);

  const isCurrentWeek = year === now.year && weekNumber === now.weekNumber;
  const isFutureWeek = year > now.year || (year === now.year && weekNumber > now.weekNumber);
  const status = tracker?.status || 'draft';
  const canEdit = !isFutureWeek && status !== 'reviewed' && (status === 'draft' || isCurrentWeek);

  useEffect(() => {
    setWeekRange(getWeekRange(year, weekNumber));
  }, [year, weekNumber]);

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/tracker/weekly/config', { cache: 'no-store' });
      const d = await r.json();
      if (d.ok && d.config) {
        setLabels({
          g1: d.config.g1Label || 'G1',
          g2: d.config.g2Label || 'G2',
          g3: d.config.g3Label || 'G3',
          g4: d.config.g4Label || 'G4',
          glTours: d.config.glToursLabel || 'GL Tours',
        });
      }
    } catch {}
  };

  const loadWeek = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/tracker/weekly?year=${year}&week=${weekNumber}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        const rec = Array.isArray(d.records) ? d.records[0] : null;
        setTracker(rec || null);
        if (rec) {
          setForm({
            g1: rec.g1 || { ...EMPTY_GOAL },
            g2: rec.g2 || { ...EMPTY_GOAL },
            g3: rec.g3 || { ...EMPTY_GOAL },
            g4: rec.g4 || { ...EMPTY_GOAL },
            glTours: rec.glTours || { target: 0, actual: 0, locations: '' },
            initial: rec.initial || '',
            onIt: rec.onIt || '',
            impact: rec.impact || '',
            notes: rec.notes || '',
            issues: rec.issues || '',
          });
        } else {
          setForm(EMPTY_FORM);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const r = await fetch(`/api/tracker/weekly?year=${year}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) setHistory(d.records || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    loadWeek();
    loadHistory();
  }, [year, weekNumber]);

  const save = async (nextStatus: 'draft' | 'submitted') => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = { year, weekNumber, ...form, status: nextStatus };
      const r = await fetch('/api/tracker/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Save failed');
      setTracker(d.tracker);
      setMsg({ ok: true, text: nextStatus === 'submitted' ? 'Week submitted.' : 'Draft saved.' });
      loadHistory();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const years = [now.year - 1, now.year].filter((y, idx, arr) => arr.indexOf(y) === idx);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div style={card} className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">ARENA OS - Weekly Tracker</h1>
            <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
              Week {weekNumber} ({weekRange.startDate} - {weekRange.endDate})
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-xl"
            style={{
              background: status === 'reviewed' ? 'rgba(16,185,129,0.15)' : status === 'submitted' ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.1)',
              color: status === 'reviewed' ? '#10b981' : status === 'submitted' ? '#f59e0b' : '#6b7280',
            }}
          >
            {status}
          </span>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-medium border ${
          msg.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>{msg.text}</div>
      )}

      <div style={card} className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Week</label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
            >
              {Array.from({ length: 44 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>Week {i + 1}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Date Range</label>
            <div className="px-3 py-2.5 rounded-xl text-sm" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#111827' }}>
              {weekRange.startDate} - {weekRange.endDate}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={card} className="p-5 text-xs text-gray-500">Loading weekly tracker...</div>
      ) : (
        <>
          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenGoals(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              Goals (G1-G4)
              {openGoals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openGoals && (
              <div className="space-y-4">
                {[
                  { key: 'g1', label: labels.g1 },
                  { key: 'g2', label: labels.g2 },
                  { key: 'g3', label: labels.g3 },
                  { key: 'g4', label: labels.g4 },
                ].map((g) => (
                  <div key={g.key} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1.5">{g.label} Target</label>
                      <input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        value={form[g.key].target}
                        onChange={(e) => setForm((p: any) => ({ ...p, [g.key]: { ...p[g.key], target: Number(e.target.value) } }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                        style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1.5">{g.label} Actual</label>
                      <input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        value={form[g.key].actual}
                        onChange={(e) => setForm((p: any) => ({ ...p, [g.key]: { ...p[g.key], actual: Number(e.target.value) } }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                        style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs text-gray-700 mb-1.5">{g.label} Notes</label>
                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={form[g.key].notes}
                        onChange={(e) => setForm((p: any) => ({ ...p, [g.key]: { ...p[g.key], notes: e.target.value } }))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                        style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenGL(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              {labels.glTours}
              {openGL ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openGL && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-700 mb-1.5">Target Visits</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    value={form.glTours.target}
                    onChange={(e) => setForm((p: any) => ({ ...p, glTours: { ...p.glTours, target: Number(e.target.value) } }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1.5">Actual Visits</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    value={form.glTours.actual}
                    onChange={(e) => setForm((p: any) => ({ ...p, glTours: { ...p.glTours, actual: Number(e.target.value) } }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 mb-1.5">Locations Visited</label>
                  <textarea
                    rows={2}
                    disabled={!canEdit}
                    value={form.glTours.locations}
                    onChange={(e) => setForm((p: any) => ({ ...p, glTours: { ...p.glTours, locations: e.target.value } }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                    style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div style={card} className="p-5 space-y-4">
            <button onClick={() => setOpenWrap(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-gray-900">
              Weekly Wrap-Up
              {openWrap ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {openWrap && (
              <div className="space-y-3">
                {[
                  { key: 'initial', label: 'INITIAL' },
                  { key: 'onIt', label: 'ON IT' },
                  { key: 'impact', label: 'IMPACT' },
                  { key: 'notes', label: 'NOTES' },
                  { key: 'issues', label: 'ISSUES' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-700 mb-1.5">{f.label}</label>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      value={form[f.key]}
                      onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-60"
                      style={{ background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {tracker?.status === 'reviewed' && (
            <div style={card} className="p-5 space-y-2">
              <div className="text-sm font-semibold text-gray-900">Admin Review</div>
              {tracker?.isGoodWeek && (
                <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg bg-green-50 text-green-600">Good Week ✓</span>
              )}
              <div className="text-xs text-gray-700">Admin Notes: {tracker?.adminNotes || '—'}</div>
              <div className="text-xs text-gray-700">Impact Assessment: {tracker?.adminImpact || '—'}</div>
              <div className="text-xs text-gray-700">Issues Noted: {tracker?.adminIssues || '—'}</div>
            </div>
          )}

          {!canEdit && tracker?.status === 'submitted' && !isCurrentWeek && (
            <div className="text-xs text-gray-600">Submitted weeks are locked after the week ends.</div>
          )}
          {isFutureWeek && (
            <div className="text-xs text-gray-600">Future weeks cannot be submitted yet.</div>
          )}
        </>
      )}

      <div className="hidden md:flex gap-3">
        <button
          onClick={() => save('draft')}
          disabled={saving || !canEdit}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-60"
          style={{ color: '#374151', background: '#fff' }}
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => save('submitted')}
          disabled={saving || !canEdit}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: '#f97316' }}
        >
          {saving ? 'Submitting...' : 'Submit Week'}
        </button>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <button
            onClick={() => save('draft')}
            disabled={saving || !canEdit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-60"
            style={{ color: '#374151', background: '#fff' }}
          >
            Draft
          </button>
          <button
            onClick={() => save('submitted')}
            disabled={saving || !canEdit}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#f97316' }}
          >
            Submit
          </button>
        </div>
      </div>

      <div style={card} className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Weekly History ({year})</h2>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Latest weeks</div>
        </div>
        {history.length === 0 ? (
          <div className="text-xs text-gray-500">No weekly tracker history yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h: any) => (
              <div key={h._id} className="p-3 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-gray-900">Week {h.weekNumber}</div>
                  <span className="text-[10px] font-semibold" style={{ color: h.status === 'reviewed' ? '#10b981' : h.status === 'submitted' ? '#f59e0b' : '#6b7280' }}>
                    {h.status}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-gray-600">{h.weekStartDate} - {h.weekEndDate}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
