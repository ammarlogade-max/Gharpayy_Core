import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/leaves/balance - Get leave balance for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get employee record
    const employee = await db.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get leave balance
    const leaveBalance = await db.leaveBalance.findUnique({
      where: { employeeId: employee.id },
    });

    if (!leaveBalance) {
      // Return default balance if not set
      return NextResponse.json({
        casual: 0,
        sick: 0,
        earned: 0,
        total: 0,
      });
    }

    return NextResponse.json(leaveBalance);
  } catch (e) {
    console.error('[leaves/balance GET]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
