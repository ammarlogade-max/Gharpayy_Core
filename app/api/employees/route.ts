import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await connectDB();
  const users = await User.find({}, 'fullName email role createdAt');
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const { fullName, email, password, role } = await req.json();
  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'fullName, email, password required' }, { status: 400 });
  }
  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  const hash = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    fullName, email: email.toLowerCase(),
    password: hash,
    role: role || 'employee',
  });
  return NextResponse.json({ ok: true, user: { id: newUser._id, email: newUser.email, fullName: newUser.fullName, role: newUser.role } });
}
