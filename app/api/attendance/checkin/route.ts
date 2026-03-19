import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';

function getISTDate() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().split('T')[0];
}

function getDayStatus(checkInTime: Date): 'Early' | 'On Time' | 'Late' {
  const ist = new Date(checkInTime.getTime() + 5.5 * 60 * 60 * 1000);
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  const total = h * 60 + m;
  if (total < 9 * 60) return 'Early';
  if (total <= 9 * 60 + 15) return 'On Time';
  return 'Late';
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id === 'admin') return NextResponse.json({ error: 'Admin cannot use attendance' }, { status: 400 });

    const { lat, lng } = await req.json().catch(() => ({ lat: null, lng: null }));
    await connectDB();

    const date = getISTDate();
    let att = await Attendance.findOne({ employeeId: user.id, date });

    if (att?.isCheckedIn) return NextResponse.json({ error: 'Already checked in' }, { status: 400 });

    const now = new Date();

    if (!att) {
      att = new Attendance({
        employeeId: user.id,
        date,
        dayStatus: getDayStatus(now),
        sessions: [{ checkIn: now, checkOut: null, workMinutes: 0, lat: lat || null, lng: lng || null }],
        totalWorkMins: 0,
        isCheckedIn: true,
      });
    } else {
      att.sessions.push({ checkIn: now, checkOut: null, workMinutes: 0, lat: lat || null, lng: lng || null });
      att.isCheckedIn = true;
      if (att.sessions.length === 1) att.dayStatus = getDayStatus(now);
    }

    await att.save();
    return NextResponse.json({ ok: true, checkInTime: now.toISOString(), dayStatus: att.dayStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
