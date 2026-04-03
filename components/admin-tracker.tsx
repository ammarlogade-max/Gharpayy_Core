'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTracker() {
  const router = useRouter();
  const [filters, setFilters] = useState({ date: '', employeeId: '', role: '', department: '', team: '', status: '' });
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.date) params.set('date', filters.date);
      if (filters.employeeId) params.set('employeeId', filters.employeeId);
      if (filters.role) params.set('role', filters.role);
      if (filters.department) params.set('department', filters.department);
      if (filters.team) params.set('team', filters.team);
      if (filters.status) params.set('status', filters.status);
      const r = await fetch(`/api/tracker?${params.toString()}`, { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) {
        setRows(d.rows || []);
        setSummary(d.summary || null);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const r = await fetch('/api/tracker/analytics', { cache: 'no-store' });
      const d = await r.json();
      if (d.ok) setAnalytics(d);
    } catch {
      setAnalytics(null);
    }
  };

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters(p => ({ ...p, date: today }));
    fetch('/api/employees?page=1&limit=100', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.users) setEmployees(d.users); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!filters.date) return;
    fetchList();
    fetchAnalytics();
  }, [filters.date, filters.employeeId, filters.role, filters.department, filters.team, filters.status]);

  const card = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 20, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' };

  return (
    <div className="space-y-4">
      <div style={card} className="p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">ARENA OS - Daily Updates</h1>
        <div className="text-xs" style={{ color: '#6b7280' }}>Track submissions across the organization</div>
      </div>

      <div style={card} className="p-5 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Date</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters(p => ({ ...p, date: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Employee</label>
          <select
            value={filters.employeeId}
            onChange={(e) => setFilters(p => ({ ...p, employeeId: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          >
            <option value="">All</option>
            {employees.map((e: any) => <option key={e._id} value={e._id}>{e.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Role</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters(p => ({ ...p, role: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          >
            <option value="">All</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="sub_admin">Sub-admin</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Department</label>
          <input
            value={filters.department}
            onChange={(e) => setFilters(p => ({ ...p, department: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
            placeholder="Department"
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Team</label>
          <input
            value={filters.team}
            onChange={(e) => setFilters(p => ({ ...p, team: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
            placeholder="Team"
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1.5" style={{ color: '#6b7280' }}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb', color: '#111827' }}
          >
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="edited">Edited</option>
            <option value="missing">Missing</option>
          </select>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Employees', value: summary.totalEmployees, color: '#111827' },
            { label: 'Submitted Today', value: summary.submittedToday, color: '#10b981' },
            { label: 'Missing Today', value: summary.missingToday, color: '#ef4444' },
            { label: 'Edited Today', value: summary.editedToday, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} style={card} className="p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value || 0}</div>
              <div className="text-[10px]" style={{ color: '#6b7280' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {analytics?.summary && (
        <div style={card} className="p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Compliance Overview</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="text-2xl font-bold text-emerald-600">{analytics.summary.dailyCompliance}%</div>
              <div className="text-[10px]" style={{ color: '#6b7280' }}>Daily</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="text-2xl font-bold text-indigo-600">{analytics.summary.weeklyCompliance}%</div>
              <div className="text-[10px]" style={{ color: '#6b7280' }}>Weekly</div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: '#f9fafb', border: '1px solid #f3f4f6' }}>
              <div className="text-2xl font-bold text-orange-500">{analytics.summary.monthlyCompliance}%</div>
              <div className="text-[10px]" style={{ color: '#6b7280' }}>Monthly</div>
            </div>
          </div>
        </div>
      )}

      <div style={card} className="p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Daily Updates Submissions</h2>
        {loading ? (
          <div className="text-xs text-gray-500">Loading submissions...</div>
        ) : rows.length === 0 ? (
          <div className="text-xs text-gray-500">No records found for the selected filters.</div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.employeeId} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/admin/tracker/${r.employeeId}`)}>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{r.employeeName}</div>
                  <div className="text-[10px]" style={{ color: '#6b7280' }}>
                    {r.role} {r.department ? `• ${r.department}` : ''} {r.teamName ? `• ${r.teamName}` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-semibold ${r.status === 'submitted' ? 'text-emerald-600' : r.status === 'edited' ? 'text-orange-500' : 'text-red-500'}`}>
                    {r.status}
                  </div>
                  <div className="text-[10px]" style={{ color: '#6b7280' }}>
                    {r.tracker?.submittedAt ? new Date(r.tracker.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Not submitted'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div style={card} className="p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Top Consistent Submitters (30d)</h2>
            {analytics.topSubmitters?.length ? (
              <div className="space-y-2">
                {analytics.topSubmitters.map((t: any) => (
                  <div key={t.employeeId} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <span className="text-gray-900 font-semibold">{t.name}</span>
                    <span className="text-gray-600">{t.submitted} submissions</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data yet.</div>
            )}
          </div>
          <div style={card} className="p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Repeated Missed Submissions (30d)</h2>
            {analytics.repeatMissed?.length ? (
              <div className="space-y-2">
                {analytics.repeatMissed.map((t: any) => (
                  <div key={t.employeeId} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <span className="text-gray-900 font-semibold">{t.name}</span>
                    <span className="text-gray-600">{t.missed} missed</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">No data yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
