import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

function todayIST() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function buildSummary(tasks: any[]) {
  const summary: any = {
    total: tasks.length,
    todo: 0,
    in_progress: 0,
    blocked: 0,
    pending_review: 0,
    completed: 0,
    overdue: 0,
    cancelled: 0,
  };
  for (const t of tasks) summary[t.status] = (summary[t.status] || 0) + 1;
  return summary;
}

function normalizeTask(task: any) {
  return {
    _id: task._id.toString(),
    title: task.title,
    description: task.description || '',
    assignedTo: task.assignedTo?.toString?.() || task.assignedTo,
    assignedToName: task.assignedToName || '',
    assignedBy: task.assignedBy || '',
    assignedByName: task.assignedByName || '',
    dueDate: task.dueDate || null,
    priority: task.priority || 'medium',
    status: task.status || 'todo',
    teamId: task.teamId || null,
    teamName: task.teamName || '',
    completionNote: task.completionNote || '',
    completionPhoto: task.completionPhoto || null,
    completedAt: task.completedAt || null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

async function refreshOverdue(tasks: any[]) {
  const today = todayIST();
  for (const t of tasks) {
    if (t.dueDate && t.dueDate < today && !['completed', 'cancelled', 'overdue'].includes(t.status)) {
      t.status = 'overdue';
      await t.save();
    }
  }
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const query: any = {};
    if (user.role === 'employee') query.assignedTo = user.id;

    const docs = await Task.find(query).sort({ createdAt: -1 });
    await refreshOverdue(docs);

    const tasks = docs.map(normalizeTask);
    return NextResponse.json({ ok: true, tasks, summary: buildSummary(tasks) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Admin/Manager only' }, { status: 403 });
    }

    const { title, description, assignedTo, assignedToName, dueDate, priority, teamName, teamId } = await req.json();
    if (!title || !assignedTo) return NextResponse.json({ error: 'title and assignedTo are required' }, { status: 400 });
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) return NextResponse.json({ error: 'Invalid assignedTo' }, { status: 400 });

    await connectDB();
    const assignee = await User.findById(assignedTo).populate('officeZoneId', 'name').lean() as any;
    if (!assignee) return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });

    const task = await Task.create({
      title: String(title).trim(),
      description: description || '',
      assignedTo,
      assignedToName: assignedToName || assignee.fullName || assignee.email,
      assignedBy: user.id,
      assignedByName: user.fullName || user.email || 'Manager',
      dueDate: dueDate || null,
      priority: priority || 'medium',
      status: 'todo',
      teamId: teamId || assignee.officeZoneId?._id?.toString?.() || null,
      teamName: teamName || assignee.officeZoneId?.name || '',
    });

    return NextResponse.json({ ok: true, task: normalizeTask(task) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, status, completionNote, completionPhoto } = await req.json();
    if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

    const allowed = ['todo', 'in_progress', 'blocked', 'pending_review', 'completed', 'overdue', 'cancelled'];
    if (status && !allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    if (user.role === 'employee' && task.assignedTo.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status) task.status = status;
    if (completionNote !== undefined) task.completionNote = completionNote;
    if (completionPhoto !== undefined) task.completionPhoto = completionPhoto;
    if (status === 'completed' && !task.completedAt) task.completedAt = new Date();
    if (status && status !== 'completed') task.completedAt = null;

    await task.save();
    return NextResponse.json({ ok: true, task: normalizeTask(task) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
