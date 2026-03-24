import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_SHIFT_RULES, getShiftRules } from '@/lib/attendance-utils';

export async function GET() {
  try {
    await connectDB();
    const rules = await getShiftRules();
    return NextResponse.json({ ok: true, rules });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { shiftStart, shiftEnd, graceMinutes, earlyGraceMinutes } = await req.json();
    const isHHMM = (v: any) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
    const grace = Number(graceMinutes);
    const earlyGrace = Number(earlyGraceMinutes ?? 0);

    if (!isHHMM(shiftStart) || !isHHMM(shiftEnd) || !Number.isFinite(grace) || grace < 0 || grace > 180 || !Number.isFinite(earlyGrace) || earlyGrace < 0 || earlyGrace > 180) {
      return NextResponse.json({ error: 'Invalid rules payload' }, { status: 400 });
    }

    await connectDB();
    const existing = await OfficeZone.findOne({});
    if (existing) {
      existing.shiftStart = shiftStart;
      existing.shiftEnd = shiftEnd;
      existing.graceMinutes = grace;
      existing.earlyGraceMinutes = earlyGrace;
      await existing.save();
    } else {
      await OfficeZone.create({
        name: 'Default Zone',
        ...DEFAULT_SHIFT_RULES,
        shiftStart,
        shiftEnd,
        graceMinutes: grace,
        earlyGraceMinutes: earlyGrace,
        weekOffDay: 'Tuesday',
      });
    }

    return NextResponse.json({ ok: true, rules: { shiftStart, shiftEnd, graceMinutes: grace, earlyGraceMinutes: earlyGrace } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
