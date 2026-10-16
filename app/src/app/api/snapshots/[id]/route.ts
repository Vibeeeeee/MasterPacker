import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import * as fs from 'fs/promises';
import * as path from 'path';

// Path to data directory
const DATA_DIR = path.join(process.cwd(), 'data');
const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots');

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get snapshot
    const snapshot = await prisma.snapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Get the actual database file
    const dbPath = path.join(DATA_DIR, 'masterpacker.db');
    const snapshotPath = path.join(SNAPSHOT_DIR, snapshot.filename);

    // Check if snapshot file exists
    try {
      await fs.access(snapshotPath);
    } catch {
      return NextResponse.json({ error: 'Snapshot file not found' }, { status: 404 });
    }

    // Close current Prisma connection
    // Note: In production, you might need to restart the server
    
    // Copy snapshot to main database
    await fs.copyFile(snapshotPath, dbPath);

    return NextResponse.json({
      success: true,
      message: 'Snapshot restored. Please restart the server for changes to take effect.',
    });
  } catch (error) {
    console.error('Error restoring snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to restore snapshot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get snapshot
    const snapshot = await prisma.snapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    // Delete snapshot file
    const snapshotPath = path.join(SNAPSHOT_DIR, snapshot.filename);
    try {
      await fs.unlink(snapshotPath);
    } catch {
      // File might not exist
    }

    // Delete snapshot record
    await prisma.snapshot.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to delete snapshot' },
      { status: 500 }
    );
  }
}
