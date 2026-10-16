import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import * as fs from 'fs/promises';
import * as path from 'path';

// Path to data directory
const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');

export async function GET(req: NextRequest) {
  try {
    // Ensure snapshot directory exists
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });

    // Get all snapshot files
    const files = await fs.readdir(SNAPSHOT_DIR);
    const snapshots = files
      .filter(file => file.endsWith('.db'))
      .map(file => ({
        filename: file,
        path: path.join('snapshots', file),
        size: 0, // Will be updated
        createdAt: new Date(file.replace('.db', '').split('_').slice(0, 2).join('_').replace(/-/g, '/')),
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Update sizes
    for (const snapshot of snapshots) {
      try {
        const stats = await fs.stat(path.join(SNAPSHOT_DIR, snapshot.filename));
        snapshot.size = stats.size;
      } catch {
        // File might not exist
      }
    }

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });

    // Get current database path
    const dbPath = path.join(DATA_DIR, 'masterpacker.db');
    
    // Generate snapshot filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot_${timestamp}.db`;
    const snapshotPath = path.join(SNAPSHOT_DIR, filename);

    // Copy database file
    await fs.copyFile(dbPath, snapshotPath);

    // Save snapshot record to database
    const snapshot = await prisma.snapshot.create({
      data: {
        filename,
        path: `snapshots/${filename}`,
        size: (await fs.stat(snapshotPath)).size,
      },
    });

    // Clean up old snapshots
    await cleanupOldSnapshots();

    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

async function cleanupOldSnapshots() {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'default' },
    });

    const maxSnapshots = config?.maxSnapshots || 30;

    // Get all snapshot files
    const files = await fs.readdir(SNAPSHOT_DIR);
    const snapshots = files
      .filter(file => file.endsWith('.db'))
      .map(file => ({
        filename: file,
        createdAt: new Date(file.replace('.db', '').split('_').slice(1, 3).join('_').replace(/-/g, '/')),
      }))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Delete oldest snapshots if we have more than max
    while (snapshots.length > maxSnapshots) {
      const oldest = snapshots.shift();
      if (oldest) {
        await fs.unlink(path.join(SNAPSHOT_DIR, oldest.filename));
        await prisma.snapshot.deleteMany({
          where: { filename: oldest.filename },
        });
      }
    }
  } catch (error) {
    console.error('Error cleaning up old snapshots:', error);
  }
}
