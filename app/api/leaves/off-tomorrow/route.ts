import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';
import { IST_OFFSET_MS } from '@/lib/constants';
import Leave from '@/models/Leave';
import { getPolicyForUser, getHolidaysInRange, calculateLeaveDays } from '@/lib/leave-utils';

function getISTDate(offsetDays = 0) {
  const d = new Date(Date.now() + IST_OFFSET_MS);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export async function POST() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (auth.role === 'admin') return NextResponse.json({ error: 'Employee/manager action only' }, { status: 403 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(auth.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const tomorrow = getISTDate(1);

    const existingLeave = await Leave.findOne({
      employeeId: auth.id,
      startDate: tomorrow,
      endDate: tomorrow,
      type: 'Casual',
      reason: 'Off tomorrow',
      status: { $in: ['pending', 'approved'] },
    }).lean();

    if (existingLeave) {
      return NextResponse.json({
        ok: true,
        status: existingLeave.status,
        message: existingLeave.status === 'approved' ? 'Off tomorrow already approved' : 'Off tomorrow request already pending',
      });
    }

    await connectDB();
    const policy = await getPolicyForUser(auth.id);
    const holidays = await getHolidaysInRange(tomorrow, tomorrow);
    const weekOffs = Array.isArray(user.workSchedule?.weekOffs) && user.workSchedule.weekOffs.length > 0
      ? user.workSchedule.weekOffs
      : Array.isArray(policy?.weeklyOffDays) ? policy.weeklyOffDays : [];

    const days = calculateLeaveDays({
      startDate: tomorrow,
      endDate: tomorrow,
      weekOffs,
      holidays: holidays.map(h => h.date),
      holidayExclusionEnabled: (policy as any)?.holidayExclusionEnabled !== false,
      weeklyOffExclusionEnabled: (policy as any)?.weeklyOffExclusionEnabled !== false,
    });

    const leave = await Leave.create({
      employeeId: auth.id,
      employeeName: user.fullName || auth.fullName || auth.email,
      type: 'Casual',
      startDate: tomorrow,
      endDate: tomorrow,
      days: days || 1,
      status: 'pending',
      reason: 'Off tomorrow',
    });

    return NextResponse.json({
      ok: true,
      status: 'pending',
      leave,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
