import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import WeeklyTracker from '@/models/WeeklyTracker';
import User from '@/models/User';
import { buildEmployeeFilter } from '@/lib/role-guards';

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'manager' && auth.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { trackerId, isGoodWeek, adminNotes, adminImpact, adminIssues } = body || {};

    if (!trackerId || !mongoose.Types.ObjectId.isValid(trackerId)) {
      return NextResponse.json({ error: 'Invalid trackerId' }, { status: 400 });
    }

    await connectDB();
    const tracker = await WeeklyTracker.findById(trackerId);
    if (!tracker) return NextResponse.json({ error: 'Tracker not found' }, { status: 404 });
    if (tracker.status !== 'submitted') {
      return NextResponse.json({ error: 'Only submitted weeks can be reviewed' }, { status: 400 });
    }

    if (auth.role === 'manager') {
      const empFilter = buildEmployeeFilter(auth, { _id: tracker.employeeId });
      if (empFilter === null) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const allowed = await User.findOne(empFilter).select('_id').lean();
      if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    tracker.status = 'reviewed';
    tracker.isGoodWeek = !!isGoodWeek;
    tracker.adminNotes = String(adminNotes || '');
    tracker.adminImpact = String(adminImpact || '');
    tracker.adminIssues = String(adminIssues || '');
    tracker.reviewedAt = new Date();
    tracker.reviewedBy = new mongoose.Types.ObjectId(auth.id);
    await tracker.save();

    return NextResponse.json({ ok: true, tracker });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

