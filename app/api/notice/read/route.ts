import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notice from '@/models/Notice';
import { getAuthUser } from '@/lib/auth';

// POST — mark notice as read
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    await connectDB();

    await Notice.findByIdAndUpdate(id, {
      $addToSet: { readBy: user.id }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}