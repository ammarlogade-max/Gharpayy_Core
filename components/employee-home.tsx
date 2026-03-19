'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Clock, CheckCircle, XCircle } from 'lucide-react';
import NoticesEmployee from '@/components/notices-employee';

interface User { id: string; email: string; fullName: string; role: string; }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function EmployeeHome({ user }: { user: User }) {
  const router = useRouter();

  const [att, setAtt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchStatus = () => {
    fetch('/api/attendance/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setAtt(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStatus(); }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  const doCheckIn = () => {
    setClocking(true);
    if (!navigator.geolocation) {
      doCheckInWithCoords(null, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => doCheckInWithCoords(pos.coords.latitude, pos.coords.longitude),
      () => doCheckInWithCoords(null, null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const doCheckInWithCoords = async (lat: number | null, lng: number | null) => {
    try {
      const r = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const d = await r.json();
      if (d.ok) { flash(`Clocked in successfully! Status: ${d.dayStatus}`, true); fetchStatus(); }
      else flash(d.error || 'Check-in failed', false);
    } catch { flash('Network error', false); }
    setClocking(false);
  };

  const doCheckOut = async () => {
    setClocking(true);
    try {
      const r = await fetch('/api/attendance/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await r.json();
      if (d.ok) { flash(`Clocked out! Worked ${fmtMins(d.totalWorkMins)} today.`, true); fetchStatus(); }
      else flash(d.error || 'Check-out failed', false);
    } catch { flash('Network error', false); }
    setClocking(false);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isIn = att?.isCheckedIn;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-xl font-bold text-orange-500">Gharpayy</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 border border-gray-200 rounded-lg px-3 py-1.5 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{user.fullName.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">{today}</p>
        </div>

        {/* Clock Card — CrazeHQ style */}
        <div className="bg-white rounded-3xl border border-gray-300 overflow-hidden mb-4">

          {/* Banner */}
          <div className="h-48 flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a1a6e 0%, #2d2d9f 45%, #7070e0 100%)' }}>
            <div className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(45deg, transparent, transparent 24px, rgba(255,255,255,0.02) 24px, rgba(255,255,255,0.02) 48px)'
            }}/>
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center">
                <div className="text-2xl font-bold text-white">{initials(user.fullName)}</div>
              </div>
              <div className="text-center">
                <div className="text-white font-bold text-lg leading-tight">{user.fullName}</div>
                <div className="text-white/60 text-sm capitalize">{user.role} · Gharpayy</div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6">

            {/* Status line */}
            <div className="mb-4">
              {loading ? (
                <div className="h-5 w-48 bg-gray-100 rounded animate-pulse"/>
              ) : isIn ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"/>
                  <span className="text-sm text-teal-600 font-medium">
                    Active · Clocked in at {att?.firstCheckIn ? new Date(att.firstCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}
                  </span>
                </div>
              ) : att?.sessions > 0 ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-400"/>
                  <span className="text-sm text-gray-500">Worked {att.totalWorkFormatted} today</span>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Not checked in yet today</span>
              )}
            </div>

            {/* Stats row — only after first check-in */}
            {!loading && att?.sessions > 0 && (
              <div className="flex gap-0 bg-gray-50 rounded-2xl overflow-hidden mb-4">
                {[
                  { label: 'First In', value: att.firstCheckIn ? new Date(att.firstCheckIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--' },
                  { label: 'Sessions', value: String(att.sessions) },
                  { label: 'Worked', value: att.totalWorkFormatted },
                  { label: 'Status', value: att.dayStatus },
                ].map((s, i, arr) => (
                  <div key={s.label} className={`flex-1 p-3 text-center ${i < arr.length - 1 ? 'border-r border-gray-200' : ''}`}>
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className={`text-sm font-bold ${s.label === 'Worked' ? 'text-teal-600' : s.label === 'Status' && s.value === 'Late' ? 'text-orange-500' : 'text-gray-800'}`}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main button */}
            <button
              onClick={isIn ? doCheckOut : doCheckIn}
              disabled={clocking || loading}
              className={`w-full py-3.5 rounded-2xl font-semibold text-base transition mb-3 ${
                isIn
                  ? 'bg-white text-orange-500 border-2 border-orange-500 hover:bg-orange-50'
                  : 'bg-orange-500 text-white hover:bg-orange-600'
              } disabled:opacity-60`}
            >
              {clocking
                ? 'Please wait...'
                : loading
                ? 'Loading...'
                : isIn
                ? 'Clock Out'
                : att?.sessions > 0
                ? 'Clock In Again'
                : 'Clock In'}
            </button>

            <p className="text-center text-xs text-gray-400">
              {isIn ? 'Tap to clock out when done for the day' : 'GPS required · Tap to mark your attendance'}
            </p>

            {/* Flash message */}
            {msg && (
              <div className={`mt-3 p-3 rounded-xl text-sm text-center font-medium ${
                msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {msg.text}
              </div>
            )}
          </div>
        </div>

        {/* Timeline card */}
        {!loading && att?.timeline && att.timeline.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-300 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-gray-800">Today's Timeline</h3>
            </div>
            <div className="space-y-2">
              {att.timeline.map((ev: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                  ev.type === 'checkin' ? 'bg-green-50' : 'bg-gray-50'
                }`}>
                  {ev.type === 'checkin'
                    ? <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  <span className="text-sm text-gray-700 flex-1">{ev.label}</span>
                  <span className="text-xs text-gray-400">{ev.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notices */}
        <div className="mt-4">
          <NoticesEmployee />
        </div>

      </div>
    </div>
  );
}