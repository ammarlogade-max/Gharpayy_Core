import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { getAuthUser } from '@/lib/auth';
import { autoCloseMissedClockOut, deriveStatusFromAttendance, getISTDateStr, getShiftRules, recomputeAttendanceTotals } from '@/lib/attendance-utils';

function fmtTime(d: Date) {
  return new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[1]
    .substring(0, 5)
    .replace(/^(\d{2}):(\d{2})/, (_, h, m) => {
      const hour = parseInt(h);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    });
}

function fmtMins(m: number) {
  if (!m) return '0m';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function getISTDateDaysAgo(days: number) {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() - days);
  return now.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    await autoCloseMissedClockOut(user.id);
    const date = getISTDateStr();
    const att = await Attendance.findOne({ employeeId: user.id, date });
    const rules = await getShiftRules();

    if (!att) {
      return NextResponse.json({
        isCheckedIn: false,
        isOnBreak: false,
        isInField: false,
        workMode: 'Absent',
        checkInTime: null,
        checkOutTime: null,
        totalWorkMins: 0,
        totalBreakMins: 0,
        totalWorkFormatted: '0m',
        totalBreakFormatted: '0m',
        lateByMins: 0,
        earlyByMins: 0,
        sessions: 0,
        dayStatus: 'Absent',
        shiftRules: rules,
        timeline: [],
      });
    }

    const lastSession = att.sessions[att.sessions.length - 1];
    const firstWorkSession = att.sessions.find((s: any) => (s.type || 'work') !== 'break');
    const lastClosedSession = [...att.sessions].reverse().find((s: any) => !!s.checkOut);
    recomputeAttendanceTotals(att);
    const derived = deriveStatusFromAttendance(att, rules);
    if (att.dayStatus !== derived.dayStatus || (att.lateByMins || 0) !== derived.lateByMins || (att.earlyByMins || 0) !== derived.earlyByMins) {
      att.dayStatus = derived.dayStatus;
      att.lateByMins = derived.lateByMins;
      att.earlyByMins = derived.earlyByMins;
      await att.save();
    }
    const timeline = [];
    for (const s of att.sessions) {
      if (s.type === 'break') {
        timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Break Started', type: 'break_start' });
        if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Break Ended', type: 'break_end' });
      } else if (s.type === 'field') {
        timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Field Exit', type: 'field_exit' });
        if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Field Return', type: 'field_return' });
      } else {
        timeline.push({ time: fmtTime(new Date(s.checkIn)), label: 'Clocked In', type: 'checkin' });
        if (s.checkOut) timeline.push({ time: fmtTime(new Date(s.checkOut)), label: 'Clocked Out', type: 'checkout' });
      }
    }
    const weekStart = getISTDateDaysAgo(6);
    const weekRows = await Attendance.find({
      employeeId: user.id,
      date: { $gte: weekStart, $lte: date },
    }).lean() as any[];
    const weekPresent = weekRows.filter((r: any) => (r.dayStatus || 'Absent') !== 'Absent').length;
    const weekLate = weekRows.filter((r: any) => r.dayStatus === 'Late').length;
    const weekEarly = weekRows.filter((r: any) => r.dayStatus === 'Early').length;
    const weekHours = weekRows.reduce((sum: number, r: any) => sum + Number(r.totalWorkMins || 0), 0);

    return NextResponse.json({
      isCheckedIn: att.isCheckedIn,
      isOnBreak: !!att.isOnBreak,
      isInField: !!att.isInField,
      workMode: att.workMode || (att.isOnBreak ? 'Break' : att.isInField ? 'Field' : att.isCheckedIn ? 'Present' : 'Absent'),
      checkInTime: firstWorkSession?.checkIn?.toISOString() || lastSession?.checkIn?.toISOString() || null,
      checkOutTime: lastClosedSession?.checkOut?.toISOString() || null,
      firstCheckIn: att.sessions[0]?.checkIn?.toISOString() || null,
      totalWorkMins: att.totalWorkMins,
      totalBreakMins: att.totalBreakMins || 0,
      totalWorkFormatted: fmtMins(att.totalWorkMins),
      totalBreakFormatted: fmtMins(att.totalBreakMins || 0),
      lateByMins: att.lateByMins || 0,
      earlyByMins: att.earlyByMins || 0,
      sessions: att.sessions.length,
      dayStatus: att.dayStatus,
      shiftRules: rules,
      timeline,
      weeklySummary: {
        startDate: weekStart,
        endDate: date,
        presentDays: weekPresent,
        lateDays: weekLate,
        earlyDays: weekEarly,
        totalWorkMins: weekHours,
        totalWorkFormatted: fmtMins(weekHours),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
