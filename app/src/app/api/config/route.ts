import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const config = await prisma.appConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        autoSnapshotInterval: 24,
        maxSnapshots: 30,
        readOnlyMode: false,
        theme: 'system',
      },
      update: {},
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { autoSnapshotInterval, maxSnapshots, readOnlyMode, theme, baseUrl } = body;

    const config = await prisma.appConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        autoSnapshotInterval: 24,
        maxSnapshots: 30,
        readOnlyMode: false,
        theme: 'system',
      },
      update: {
        autoSnapshotInterval,
        maxSnapshots,
        readOnlyMode,
        theme,
        baseUrl,
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}
