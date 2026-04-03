import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import WeeklyTrackerConfig from '@/models/WeeklyTrackerConfig';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid org id' }, { status: 400 });
    }
    await connectDB();
    const orgObjectId = new mongoose.Types.ObjectId(auth.id);
    let config = await WeeklyTrackerConfig.findOne({ orgId: orgObjectId }).lean();
    if (!config && auth.role === 'employee') {
      config = await WeeklyTrackerConfig.findOne({}).lean();
    }
    return NextResponse.json({
      ok: true,
      config: config || {
        g1Label: 'G1',
        g2Label: 'G2',
        g3Label: 'G3',
        g4Label: 'G4',
        glToursLabel: 'GL Tours',
      },
    });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || (auth.role !== 'admin' && auth.role !== 'sub_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'Invalid org id' }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const { g1Label, g2Label, g3Label, g4Label, glToursLabel } = body || {};

    await connectDB();
    const orgObjectId = new mongoose.Types.ObjectId(auth.id);
    const config = await WeeklyTrackerConfig.findOneAndUpdate(
      { orgId: orgObjectId },
      {
        $set: {
          g1Label: String(g1Label || 'G1'),
          g2Label: String(g2Label || 'G2'),
          g3Label: String(g3Label || 'G3'),
          g4Label: String(g4Label || 'G4'),
          glToursLabel: String(glToursLabel || 'GL Tours'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
