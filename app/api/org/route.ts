import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OfficeZone from '@/models/OfficeZone';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

// GET /api/org
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const users = await User.find({}, '-password')
      .populate('officeZoneId', 'name')
      .populate('managerId', 'fullName email role')
      .lean() as any[];

    const zones = await OfficeZone.find({}).lean() as any[];

    const dbManagers = users.filter(u => u.role === 'admin' || u.role === 'manager');
    const employees  = users.filter(u => u.role === 'employee');

    // Check if any employees have managerId assigned
    const hasManagerAssignments = employees.some(e => e.managerId);

    let tree: any[] = [];

    if (hasManagerAssignments && dbManagers.length > 0) {
      // Group by manager
      tree = dbManagers.map(mgr => ({
        _id:      mgr._id.toString(),
        fullName: mgr.fullName,
        email:    mgr.email,
        role:     mgr.role,
        team:     (mgr.officeZoneId as any)?.name || 'No Zone',
        groupType: 'manager',
        reports:  employees
          .filter(e => e.managerId?.toString() === mgr._id.toString())
          .map(e => mapEmployee(e)),
      }));
    } else {
      // Group by office zone instead
      tree = zones.map(z => ({
        _id:      z._id.toString(),
        fullName: z.name,
        email:    '',
        role:     'zone',
        team:     z.name,
        groupType: 'zone',
        reports:  employees
          .filter(e => e.officeZoneId?._id?.toString() === z._id.toString() ||
                       (e.officeZoneId as any)?._id?.toString() === z._id.toString())
          .map(e => mapEmployee(e)),
      })).filter(z => z.reports.length > 0);
    }

    // Unassigned = employees with no managerId AND no officeZoneId
    const unassigned = hasManagerAssignments
      ? employees.filter(e => !e.managerId).map(e => mapEmployee(e))
      : []; // when grouping by zone, all should be in a zone

    // Available managers for dropdown (DB managers + static admin)
    const availableManagers = [
      ...dbManagers.map(m => ({
        _id:      m._id.toString(),
        fullName: m.fullName,
        email:    m.email,
        role:     m.role,
      })),
    ];

    return NextResponse.json({
      ok: true,
      tree,
      unassigned,
      total: users.length,
      groupedByZone: !hasManagerAssignments,
      availableManagers,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function mapEmployee(e: any) {
  return {
    _id:        e._id.toString(),
    fullName:   e.fullName,
    email:      e.email,
    role:       e.role,
    teamName:   e.teamName   || '',
    department: e.department || '',
    team:       (e.officeZoneId as any)?.name || 'No Zone',
    jobRole:    e.jobRole    || '',
    isApproved: e.isApproved,
  };
}

// PATCH /api/org — assign manager/team/department
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 401 });
    }

    const { employeeId, managerId, teamName, department } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 });

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    await connectDB();

    const update: any = {};
    if (managerId  !== undefined) update.managerId  = managerId || null;
    if (teamName   !== undefined) update.teamName   = teamName;
    if (department !== undefined) update.department = department;

    const updated = await User.findByIdAndUpdate(
      employeeId, update, { new: true }
    ).select('-password');

    if (!updated) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    return NextResponse.json({ ok: true, employee: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}