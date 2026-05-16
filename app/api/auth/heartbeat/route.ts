import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth || auth.id === 'admin') {
      return NextResponse.json({ ok: true }); // Silent skip for admin/no-auth
    }

    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 });

    await connectDB();
    
    // Efficiently update lastSeenAt only if the token matches the active session
    const res = await User.updateOne(
      { _id: auth.id, activeSessionToken: token },
      { $set: { lastSeenAt: new Date() } }
    );

    if (res.matchedCount === 0) {
      // This means the user has a valid token for some session, 
      // but it's not the "active" session in the DB (stale or replaced).
      return NextResponse.json({ error: 'Session superseded', superseded: true }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Heartbeat] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
