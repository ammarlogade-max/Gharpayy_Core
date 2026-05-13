'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, Check, X, Info, Search, Filter, History, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function GrowthAdminPage() {
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('pending');

  const fetchRedemptions = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/growth/redemptions?status=${filter === 'all' ? '' : filter}&limit=50`);
      const d = await r.json();
      if (d.ok) setRedemptions(d.redemptions);
    } catch (e) {
      toast.error("Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, [filter]);

  const handleAction = async (id: string, status: string) => {
    setProcessingId(id);
    const adminNotes = status === 'rejected' ? window.prompt("Reason for rejection?") : "";
    
    if (status === 'rejected' && adminNotes === null) {
      setProcessingId(null);
      return;
    }

    try {
      const r = await fetch(`/api/growth/redemptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes })
      });
      const d = await r.json();
      if (d.ok) {
        toast.success(`Redemption ${status} successfully`);
        fetchRedemptions();
      } else {
        toast.error(d.error || "Action failed");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const map: any = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      fulfilled: 'bg-blue-100 text-blue-700'
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" />
            Growth Governance
          </h1>
          <p className="text-gray-500 font-medium">Review and manage reward redemptions across the organization.</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl h-11 w-fit">
          {['pending', 'approved', 'fulfilled', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 rounded-xl text-xs font-bold capitalize transition-all",
                filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-gray-500">Loading requests...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reward</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Cost</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {redemptions.map((r: any) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-gray-200">
                          <AvatarImage src={r.userId?.profilePhoto} />
                          <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                            {r.userId?.fullName?.split(' ').map((n:any) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{r.userId?.fullName || 'User'}</div>
                          <div className="text-[10px] text-gray-500">{r.userId?.teamName || 'No Team'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{r.rewardTitle}</div>
                      {r.notes && <div className="text-[10px] text-gray-400 italic truncate max-w-[150px]">"{r.notes}"</div>}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-gray-900 text-right">
                      {r.coinCost.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <Badge className={cn("text-[9px] font-bold border-none capitalize", getStatusColor(r.status))}>
                         {r.status}
                       </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       {r.status === 'pending' && (
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="h-8 w-8 p-0 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                             disabled={processingId === r._id}
                             onClick={() => handleAction(r._id, 'rejected')}
                           >
                             <X className="w-4 h-4" />
                           </Button>
                           <Button 
                             size="sm" 
                             className="h-8 w-8 p-0 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                             disabled={processingId === r._id}
                             onClick={() => handleAction(r._id, 'approved')}
                           >
                             <Check className="w-4 h-4" />
                           </Button>
                         </div>
                       )}
                       {r.status === 'approved' && (
                         <Button 
                           size="sm" 
                           className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold"
                           disabled={processingId === r._id}
                           onClick={() => handleAction(r._id, 'fulfilled')}
                         >
                           Fulfill Reward
                         </Button>
                       )}
                    </td>
                  </tr>
                ))}
                {redemptions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                      No redemption requests found for the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
