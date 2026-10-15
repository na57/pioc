import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { findUserRoles } from '@/lib/database/models/user';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const roles = await findUserRoles(session.userId);

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        roles: roles.map((r) => r.name),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to get session', error: String(error) },
      { status: 500 }
    );
  }
}
