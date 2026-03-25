import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, dateOfBirth, jobRole, profilePhoto, officeZoneId, workStartTime, workEndTime, breakDuration } = await req.json();

    // Validation
    if (!fullName?.trim()) return NextResponse.json({ error: 'Full name required' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    if (!dateOfBirth) return NextResponse.json({ error: 'Date of birth required' }, { status: 400 });
    if (!jobRole) return NextResponse.json({ error: 'Job role required' }, { status: 400 });
    if (!officeZoneId) return NextResponse.json({ error: 'Office zone required' }, { status: 400 });
    if (!workStartTime || !/^\d{2}:\d{2}$/.test(workStartTime)) return NextResponse.json({ error: 'Valid work start time required' }, { status: 400 });
    if (!workEndTime || !/^\d{2}:\d{2}$/.test(workEndTime)) return NextResponse.json({ error: 'Valid work end time required' }, { status: 400 });
    const breakMins = Number(breakDuration);
    if (!Number.isFinite(breakMins) || breakMins < 0 || breakMins > 240) return NextResponse.json({ error: 'Valid break duration required' }, { status: 400 });

    await connectDB();

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user (not approved by default)
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      dateOfBirth,
      jobRole,
      profilePhoto, // base64 string
      officeZoneId,
      isApproved: false, // waiting for admin approval
      role: 'employee',
      workSchedule: {
        startTime: workStartTime,
        endTime: workEndTime,
        breakDuration: breakMins,
        isLocked: true,
        setBy: 'employee',
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Signup successful! Please wait for admin approval.',
      userId: user._id.toString(),
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
