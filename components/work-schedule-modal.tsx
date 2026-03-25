'use client';
import { useEffect, useState } from 'react';

export default function WorkScheduleModal() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [breakDuration, setBreakDuration] = useState(45);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.role !== 'employee') return;
        const ws = d?.workSchedule;
        const hasSchedule = ws?.startTime && ws?.endTime && Number.isFinite(Number(ws?.breakDuration));
        if (!hasSchedule) setOpen(true);
      })
      .catch(() => {});
  }, []);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/work-schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime, breakDuration }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || 'Unable to save work schedule');
        return;
      }
      setOpen(false);
    } catch {
      setError('Network error while saving schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
        <h3 className="text-lg font-bold text-gray-900">Set Work Schedule</h3>
        <p className="text-xs mt-1 text-gray-700">This is mandatory and can only be changed later by admin.</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs text-gray-700 mb-1">Work Start</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-700 mb-1">Work End</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-700 mb-1">Break Duration (minutes)</label>
          <input type="number" min={0} max={240} value={breakDuration} onChange={e => setBreakDuration(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
        <button onClick={save} disabled={saving}
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#f97316' }}>
          {saving ? 'Saving...' : 'Save and Continue'}
        </button>
      </div>
    </div>
  );
}

