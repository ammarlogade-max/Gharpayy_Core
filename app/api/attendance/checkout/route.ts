import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id === 'admin') return NextResponse.json({ error: 'Admin cannot use attendance' }, { status: 400 });

    await req.json().catch(() => ({}));
    await connectDB();

    const date = getISTDate();
    const att = await Attendance.findOne({ employeeId: user.id, date });

    if (!att || !att.isCheckedIn) return NextResponse.json({ error: 'Not checked in' }, { status: 400 });

    const now = new Date();
    const lastSession = att.sessions[att.sessions.length - 1];
    if (!lastSession.checkOut) {
      lastSession.checkOut = now;
      lastSession.workMinutes = Math.floor((now.getTime() - lastSession.checkIn.getTime()) / 60000);
    }

    att.isCheckedIn = false;
    att.totalWorkMins = att.sessions.reduce((sum: number, s: any) => sum + (s.workMinutes || 0), 0);
    att.markModified('sessions');
    await att.save();

    return NextResponse.json({ ok: true, checkOutTime: now.toISOString(), totalWorkMins: att.totalWorkMins });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
