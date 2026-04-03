import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Tracker from '@/models/Tracker';
import { getISTDateStr } from '@/lib/attendance-utils';
import mongoose from 'mongoose';

function normalizeText(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'User record not found for tracker' }, { status: 400 });
    }
    await connectDB();
    const date = getISTDateStr();
    const tracker = await Tracker.findOne({ employeeId: auth.id, date }).lean();
    return NextResponse.json({ ok: true, date, tracker });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const initial = normalizeText(body.initial);
    const onIt = normalizeText(body.onIt);
    const impact = normalizeText(body.impact);
    const notes = normalizeText(body.notes);
    const issues = normalizeText(body.issues);
    const submit = !!body.submit;
    const missing = [initial, onIt, impact, notes, issues].some(v => !v);
    if (submit && missing) {
      return NextResponse.json({ error: 'Submit requires all fields' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(auth.id)) {
      return NextResponse.json({ error: 'User record not found for tracker' }, { status: 400 });
    }
    await connectDB();
    const date = getISTDateStr();
    const existing = await Tracker.findOne({ employeeId: auth.id, date });

    const fieldsFilled = [initial, onIt, impact, notes, issues].filter(Boolean).length;
    const completionScore = Math.round((fieldsFilled / 5) * 100);

    if (!existing) {
      const created = await Tracker.create({
        employeeId: auth.id,
        date,
        role: auth.role,
        initial,
        onIt,
        impact,
        notes,
        issues,
        submittedAt: submit ? new Date() : null,
        isSubmitted: submit,
        isEdited: false,
        submissionStatus: submit ? 'submitted' : 'pending',
        completionScore,
      });
      return NextResponse.json({ ok: true, tracker: created });
    }

    const wasSubmitted = !!existing.isSubmitted;
    existing.initial = initial;
    existing.onIt = onIt;
    existing.impact = impact;
    existing.notes = notes;
    existing.issues = issues;
    if (submit) {
      existing.isSubmitted = true;
      existing.isEdited = wasSubmitted || existing.isEdited;
      existing.submissionStatus = existing.isEdited ? 'edited' : 'submitted';
      existing.submittedAt = existing.submittedAt || new Date();
    } else {
      existing.isSubmitted = wasSubmitted;
      existing.submissionStatus = wasSubmitted ? (existing.isEdited ? 'edited' : 'submitted') : 'pending';
    }
    existing.completionScore = completionScore;
    await existing.save();

    return NextResponse.json({ ok: true, tracker: existing });
  } catch (e: unknown) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
