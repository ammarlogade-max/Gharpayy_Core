'use client';
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

type DayStatus = 'Early' | 'On Time' | 'Late' | 'Absent' | 'none';

interface HeatmapRow {
  employeeId: string;
  employeeName: string;
  days: Record<string, DayStatus>;
}

const STATUS_COLOR: Record<DayStatus, string> = {
  'Early':    'bg-teal-700',
  'On Time':  'bg-teal-500',
  'Late':     'bg-yellow-400',
  'Absent':   'bg-pink-300',
  'none':     'bg-gray-200',
};

function getWeekDates() {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return { label, date: d.toLocaleDateString('en-CA') };
  });
}

function getWeekStr() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${year}-${String(week).padStart(2, '0')}`;
}

export default function WeeklyHeatmap() {
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [present, setPresent] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const weekDays = getWeekDates();
  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    fetch(`/api/attendance/heatmap?week=${getWeekStr()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.heatmap) setHeatmap(d.heatmap);
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

      <h3 className="text-gray-600 text-sm md:text-base font-medium mb-6">Weekly Heatmap</h3>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-2 items-center">
              <div className="w-20 h-4 bg-gray-200 rounded"/>
              {[1,2,3,4,5,6].map(j => <div key={j} className="flex-1 h-10 bg-gray-100 rounded-lg"/>)}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-2 mb-4">
            <div className="w-20 flex-shrink-0"/>
            {weekDays.map(d => (
              <div key={d.date} className={`flex-1 text-center text-xs md:text-sm font-medium ${d.date === today ? 'text-orange-500' : 'text-gray-500'}`}>
                {d.label}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {heatmap.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No attendance data yet this week</p>
            ) : heatmap.map(row => (
              <div key={row.employeeId} className="flex gap-2 items-center">
                <div className="w-20 flex-shrink-0 text-xs md:text-sm text-gray-600 truncate">
                  {row.employeeName.split(' ').map((n, i) => i === 0 ? n : n[0] + '.').join(' ')}
                </div>
                {weekDays.map(d => {
                  const status: DayStatus = (row.days[d.date] as DayStatus) || 'none';
                  return (
                    <div
                      key={d.date}
                      title={status === 'none' ? '—' : status}
                      className={`flex-1 h-10 md:h-12 rounded-lg ${STATUS_COLOR[status]} transition hover:opacity-80 ${d.date === today ? 'ring-2 ring-orange-400 ring-offset-1' : ''}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 md:gap-6 mt-6 pt-4 border-t border-gray-200">
        {(['Early', 'On Time', 'Late', 'Absent'] as DayStatus[]).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${STATUS_COLOR[s]}`}/>
            <span className="text-xs md:text-sm text-gray-600">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
