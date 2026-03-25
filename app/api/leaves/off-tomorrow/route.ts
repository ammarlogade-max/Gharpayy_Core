import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import User from '@/models/User';
import mongoose from 'mongoose';

function getISTDate(offsetDays = 0) {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
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
    const leaves = Array.isArray(user.leaves) ? user.leaves : [];
    const exists = leaves.some((l: any) => l.date === tomorrow && l.type === 'day_off');
    if (!exists) {
      leaves.push({ date: tomorrow, type: 'day_off', status: 'approved' } as any);
      user.leaves = leaves as any;
      await user.save();
    }

    return NextResponse.json({ ok: true, leave: { date: tomorrow, type: 'day_off', status: 'approved' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

