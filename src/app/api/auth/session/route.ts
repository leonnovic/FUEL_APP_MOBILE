import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await validateSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Format permissions
    const permissions = user.permissions.map((p) => ({
      action: p.action,
      dataType: p.dataType,
      teamScope: p.teamScope,
      stationId: p.stationId,
    }));

    // Format assigned stations with station details
    const assignedStations = user.stations.map((s) => ({
      id: s.station.id,
      name: s.station.name,
      location: s.station.location,
      role: s.role,
      active: s.active,
    }));

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        permissions,
        assignedStations,
      },
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid session' },
      { status: 401 }
    );
  }
}
