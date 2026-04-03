import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const employeeIdParam = searchParams.get('employeeId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    let employeeId = auth.id;
    if ((auth.role === 'admin' || auth.role === 'manager' || auth.role === 'sub_admin') && employeeIdParam) {
      employeeId = employeeIdParam;
    }

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();
    if (auth.role === 'manager' && employeeId !== auth.id) {
      const emp = await User.findById(employeeId).select('managerId').lean() as any;
      if (!emp || emp.managerId?.toString() !== auth.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const match: any = { employeeId: new mongoose.Types.ObjectId(employeeId) };
    if (start && end) match.date = { $gte: start, $lte: end };

    const total = await Tracker.countDocuments(match);
    const rows = await Tracker.find(match).sort({ date: -1 })
      .skip((page - 1) * limit).limit(limit).lean();

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      records: rows,
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
