import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';

function getISTDateStr(d = new Date()) {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function getMonthRange(ym?: string) {
  const base = ym && /^\d{4}-\d{2}$/.test(ym) ? `${ym}-01` : `${getISTDateStr().slice(0, 7)}-01`;
  const start = base;
  const end = `${base.slice(0, 7)}-31`;
  return { start, end };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const month = searchParams.get('month');
    const employeeIdParam = searchParams.get('employeeId');

    let employeeId = user.id;
    if ((user.role === 'admin' || user.role === 'manager') && employeeIdParam) {
      employeeId = employeeIdParam;
    }

    await connectDB();
    const range = start && end ? { start, end } : getMonthRange(month || undefined);

    const rows = await Attendance.find({
      employeeId,
      date: { $gte: range.start, $lte: range.end },
    })
      .sort({ date: -1 })
      .lean() as any[];

    const records = rows.map((r: any) => {
      const firstWork = (r.sessions || []).find((s: any) => (s.type || 'work') !== 'break');
      const lastClosed = [...(r.sessions || [])].reverse().find((s: any) => !!s.checkOut);
      return {
        date: r.date,
        dayStatus: r.dayStatus || 'Absent',
        workMode: r.workMode || 'Absent',
        totalWorkMins: Number(r.totalWorkMins || 0),
        totalBreakMins: Number(r.totalBreakMins || 0),
        lateByMins: Number(r.lateByMins || 0),
        earlyByMins: Number(r.earlyByMins || 0),
        isCheckedIn: !!r.isCheckedIn,
        firstCheckIn: firstWork?.checkIn || null,
        lastCheckOut: lastClosed?.checkOut || null,
      };
    });

    return NextResponse.json({
      ok: true,
      range,
      records,
      summary: {
        totalDays: records.length,
        presentDays: records.filter((r: any) => r.dayStatus !== 'Absent').length,
        lateDays: records.filter((r: any) => r.dayStatus === 'Late').length,
        earlyDays: records.filter((r: any) => r.dayStatus === 'Early').length,
        totalWorkMins: records.reduce((s: number, r: any) => s + Number(r.totalWorkMins || 0), 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

