'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';

interface Employee {
  employeeId: string;
  employeeName: string;
  role: string;
  checkInTime: string | null;
  isCheckedIn: boolean;
  dayStatus: 'Early' | 'On Time' | 'Late' | 'Absent';
  totalWorkMins: number;
}

const COLORS = ['bg-blue-200','bg-purple-200','bg-yellow-200','bg-green-200','bg-pink-200','bg-orange-200'];
const TEXT_COLORS = ['text-blue-700','text-purple-700','text-yellow-700','text-green-700','text-pink-700','text-orange-700'];

function initials(name: string) {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function colorIdx(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % COLORS.length;
  return h;
}

function statusColor(status: string) {
  if (status === 'On Time' || status === 'Early') return 'text-green-600';
  if (status === 'Late') return 'text-orange-500';
  return 'text-red-500';
}

export default function TodaysLog() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/attendance/heatmap', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.todayLog) setEmployees(d.todayLog);
        if (d.present !== undefined) setPresent(d.present);
        if (d.total !== undefined) setTotal(d.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-gray-300 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-orange-500" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Attendance</h2>
        </div>
        <span className="text-gray-500 text-sm md:text-base">
          Today · <strong className="text-gray-800">{present}/{total} present</strong>
        </span>
      </div>

      <h3 className="text-gray-600 text-sm md:text-base font-medium mb-4">Today's Log</h3>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl"/>)}
        </div>
      ) : employees.length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">No employee records found</p>
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const ci = colorIdx(emp.employeeName);
            return (
              <div
                key={emp.employeeId}
                onClick={() => router.push(`/employee-detail?id=${emp.employeeId}`)}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${COLORS[ci]} flex items-center justify-center text-xs font-bold ${TEXT_COLORS[ci]}`}>
                    {initials(emp.employeeName)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{emp.employeeName}</p>
                    <p className="text-xs md:text-sm text-gray-500 capitalize">{emp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm md:text-base text-gray-600">
                    {emp.checkInTime || '--:--'}
                  </span>
                  <span className={`text-xs md:text-sm font-medium ${statusColor(emp.dayStatus)}`}>
                    {emp.isCheckedIn ? emp.dayStatus : emp.dayStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
