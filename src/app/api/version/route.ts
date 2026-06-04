import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Return the latest active AppVersion record
    const latestVersion = await db.appVersion.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, error: 'No active version found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      version: {
        id: latestVersion.id,
        version: latestVersion.version,
        buildNumber: latestVersion.buildNumber,
        releaseNotes: latestVersion.releaseNotes,
        isActive: latestVersion.isActive,
        createdAt: latestVersion.createdAt,
      },
    });
  } catch (error) {
    console.error('[Version API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}
