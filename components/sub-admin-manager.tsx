'use client';
import { useState, useEffect, useCallback } from 'react';
import { UserPlus, RefreshCw, Users } from 'lucide-react';

interface SubAdmin {
  id: string;
  fullName: string;
  email: string;
  assignedTeamId: string | null;
  assignedTeamName: string;
  isApproved: boolean;
  createdAt: string;
}

interface Zone {
  _id: string;
  name: string;
}

export default function SubAdminManager() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form state
  const [form, setForm] = useState({ fullName: '', email: '', password: '', teamId: '' });
  const [creating, setCreating] = useState(false);

  // Reassign state
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [newTeamId, setNewTeamId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [saRes, zoneRes] = await Promise.all([
        fetch('/api/admin/create-subadmin'),
        fetch('/api/zones'),
      ]);
      const saData = await saRes.json();
      const zoneData = await zoneRes.json();
      if (saData.ok) setSubAdmins(saData.subAdmins);
      if (Array.isArray(zoneData)) setZones(zoneData);
      else if (zoneData.zones) setZones(zoneData.zones);
    } catch {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/create-subadmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create sub-admin'); return; }
      setSuccess(`Sub-admin ${data.subAdmin.fullName} created successfully`);
      setForm({ fullName: '', email: '', password: '', teamId: '' });
      fetchData();
    } finally {
      setCreating(false);
    }
  };

  const handleReassign = async (subAdminId: string) => {
    if (!newTeamId) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/create-subadmin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subAdminId, teamId: newTeamId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reassign'); return; }
      setSuccess('Team reassigned successfully');
      setReassigning(null);
      setNewTeamId('');
      fetchData();
    } catch {
      setError('Failed to reassign');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-orange-500" />
          Sub-Admin Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">Create and manage sub-admins with restricted team access.</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>}

      {/* Create Sub-Admin Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-orange-500" />
          Create New Sub-Admin
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Team (Zone)</label>
              <select
                required
                value={form.teamId}
                onChange={e => setForm(f => ({ ...f, teamId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select a zone...</option>
                {zones.map(z => (
                  <option key={z._id} value={z._id}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Sub-Admin'}
          </button>
        </form>
      </div>

      {/* Sub-Admins List */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">All Sub-Admins ({subAdmins.length})</h2>
          <button onClick={fetchData} className="text-gray-400 hover:text-gray-600 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : subAdmins.length === 0 ? (
          <p className="text-sm text-gray-400">No sub-admins created yet.</p>
        ) : (
          <div className="space-y-3">
            {subAdmins.map(sa => (
              <div key={sa.id} className="border border-gray-100 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{sa.fullName}</p>
                  <p className="text-xs text-gray-500">{sa.email}</p>
                  <p className="text-xs text-orange-600 mt-0.5">Team: {sa.assignedTeamName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {reassigning === sa.id ? (
                    <>
                      <select
                        value={newTeamId}
                        onChange={e => setNewTeamId(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                      >
                        <option value="">Select zone...</option>
                        {zones.map(z => (
                          <option key={z._id} value={z._id}>{z.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleReassign(sa.id)}
                        className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition"
                      >Save</button>
                      <button
                        onClick={() => { setReassigning(null); setNewTeamId(''); }}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >Cancel</button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setReassigning(sa.id); setNewTeamId(sa.assignedTeamId || ''); }}
                      className="text-xs border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition"
                    >Reassign Team</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
