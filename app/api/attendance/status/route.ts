import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const date = getISTDate();
    const att = await Attendance.findOne({ employeeId: user.id, date });

    if (!att) {
      return NextResponse.json({
        isCheckedIn: false,
        checkInTime: null,
        checkOutTime: null,
        totalWorkMins: 0,
        totalWorkFormatted: '0m',
        sessions: 0,
        dayStatus: 'Absent',
        timeline: [],
      });
    }

    const lastSession = att.sessions[att.sessions.length - 1];
    const timeline = [];
    for (const s of att.sessions) {
      timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Clocked In', type: 'checkin' });
      if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Clocked Out', type: 'checkout' });
    }

    return NextResponse.json({
      isCheckedIn: att.isCheckedIn,
      checkInTime: lastSession?.checkIn?.toISOString() || null,
      checkOutTime: lastSession?.checkOut?.toISOString() || null,
      firstCheckIn: att.sessions[0]?.checkIn?.toISOString() || null,
      totalWorkMins: att.totalWorkMins,
      totalWorkFormatted: fmtMins(att.totalWorkMins),
      sessions: att.sessions.length,
      dayStatus: att.dayStatus,
      timeline,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
