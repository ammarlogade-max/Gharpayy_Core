'use client';
import { useEffect, useState, useRef } from 'react';

interface AttStatus {
  isCheckedIn: boolean;
  checkInTime: string | null;
  firstCheckIn: string | null;
  totalWorkMins: number;
  totalWorkFormatted: string;
  sessions: number;
  dayStatus: string;
  timeline: { time: string; label: string; type: string }[];
}

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function EmployeeDetail({ employeeId }: { employeeId?: string }) {
  const [att, setAtt] = useState<AttStatus | null>(null);
  const [user, setUser] = useState<{ fullName: string; role: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

// Ticking clock
  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const fetchStatus = () => {
    fetch('/api/attendance/status', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setAtt(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => {});
  }, []);

  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const doCheckIn = () => {
    setClocking(true);
    if (!navigator.geolocation) { doCheckInCoords(null, null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => doCheckInCoords(pos.coords.latitude, pos.coords.longitude),
      () => doCheckInCoords(null, null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const doCheckInCoords = async (lat: number | null, lng: number | null) => {
    try {
      const r = await fetch('/api/attendance/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const d = await r.json();
      if (d.ok) { flash(`Clocked in! Status: ${d.dayStatus}`, true); fetchStatus(); }
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

  const isIn = att?.isCheckedIn;

  // User display
  const displayName = user?.fullName || 'Employee';
  const displayRole = user?.role
    ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} · Gharpayy`
    : 'Gharpayy';
  const ini = displayName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  // Live ticking time
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const parts = timeStr.split(' ');
  const timePart = parts[0];
  const ampm = parts[1] || '';

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 space-y-4 max-w-md mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-semibold text-gray-800 text-lg">Attendance</h1>
        </div>
        <div className="flex items-center bg-orange-50 px-3 py-1 rounded-full">
          <span className="text-xs text-orange-600 font-medium">
            {loading
              ? 'Loading...'
              : isIn
              ? `Status: ${att?.dayStatus}`
              : att?.sessions && att.sessions > 0
              ? `Worked: ${att.totalWorkFormatted}`
              : 'Not checked in'}
          </span>
        </div>
      </div>

      {/* User Card */}
      <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
          <span className="text-blue-700 font-semibold text-sm">{ini}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 text-lg truncate">{displayName}</h2>
          <p className="text-gray-600 text-sm">{displayRole}</p>
        </div>
      </div>

      {/* Clock Section */}
      <div className="flex flex-col items-center space-y-3 p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
        ) : (
          <>
            <div
              className="text-3xl font-mono font-bold text-gray-800 bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center"
              suppressHydrationWarning
            >
              {timePart}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide" suppressHydrationWarning>
              {ampm}
            </div>

            {/* Stats — only after first clock-in */}
            {att && att.sessions > 0 && (
              <div className="w-full grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 mt-1">
                {[
                  {
                    label: 'First In',
                    value: att.firstCheckIn
                      ? new Date(att.firstCheckIn).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit', hour12: true,
                        })
                      : '--',
                  },
                  { label: 'Sessions', value: String(att.sessions) },
                  { label: 'Worked',   value: att.totalWorkFormatted },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wide">{s.label}</div>
                    <div className="text-sm font-bold text-gray-700 mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Clock In / Out Button */}
      <div className="text-center">
        <button
          onClick={isIn ? doCheckOut : doCheckIn}
          disabled={clocking || loading}
          className={`w-full font-medium py-4 px-6 rounded-2xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] border disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none ${
            isIn
              ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-400'
              : 'bg-green-500 hover:bg-green-600 text-white border-green-400'
          }`}
        >
          {clocking
            ? 'Please wait...'
            : loading
            ? 'Loading...'
            : isIn
            ? 'Clock Out'
            : att?.sessions && att.sessions > 0
            ? 'Clock In Again'
            : 'Clock In'}
        </button>

        <p className={`text-xs mt-2 font-medium ${isIn ? 'text-green-700' : 'text-gray-400'}`}>
          {loading
            ? ''
            : isIn
            ? '● Within geo-fence · Koramangala Office'
            : att?.sessions && att.sessions > 0
            ? `Clocked out · ${att.totalWorkFormatted} worked today`
            : 'GPS required · Click to mark attendance'}
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`p-3 rounded-2xl text-sm text-center font-medium ${
          msg.ok
            ? 'bg-green-50 text-green-700 border border-green-100'
            : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Timeline */}
      {att?.timeline && att.timeline.length > 0 && (
        <div className="pt-1">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Today's Timeline</h3>
          <div className="space-y-2">
            {att.timeline.map((ev, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                ev.type === 'checkin'
                  ? 'bg-green-50 border border-green-100'
                  : 'bg-gray-50 border border-gray-100'
              }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  ev.type === 'checkin' ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="text-sm text-gray-700 flex-1">{ev.label}</span>
                <span className="text-xs text-gray-400">{ev.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}