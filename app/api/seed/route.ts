import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  await connectDB();

  const employees = [
    { fullName: 'Satvik Sharma',  email: 'satvik.gharpayy@gmail.com',   role: 'employee' },
    { fullName: 'Pulkit Gupta',   email: 'pulkit.gharpayy@gmail.com',   role: 'employee' },
    { fullName: 'Sidhant Verma',  email: 'siddhant.gharpayy@gmail.com', role: 'employee' },
    { fullName: 'Nayana Pillai',  email: 'nayana.gharpayy@gmail.com',   role: 'employee' },
    { fullName: 'Ammar Logade',  email: 'ammar.gharpayy@gmail.com',   role: 'employee' },
  ];

  const hash = await bcrypt.hash('Pass@1234', 12);
  const results = [];

  for (const emp of employees) {
    const existing = await User.findOne({ email: emp.email });
    if (existing) { results.push({ email: emp.email, status: 'already exists' }); continue; }
    await User.create({ ...emp, password: hash });
    results.push({ email: emp.email, status: 'created' });
  }

  return NextResponse.json({ ok: true, results });
}
