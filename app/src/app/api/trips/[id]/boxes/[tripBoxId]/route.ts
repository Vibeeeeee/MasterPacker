import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tripBoxId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, tripBoxId } = await params;

    // Items packed into this box go back to the unpacked pool
    // Find the box id for this trip box to unassign packed items
    const tripBox = await prisma.tripBox.findUnique({
      where: { id: tripBoxId },
    });

    if (tripBox) {
      await prisma.tripItem.updateMany({
        where: { tripId: id, packedBoxId: tripBox.boxId },
        data: { packedBoxId: null },
      });
      await prisma.tripBox.delete({ where: { id: tripBoxId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing box from trip:', error);
    return NextResponse.json(
      { error: 'Failed to remove box from trip' },
      { status: 500 }
    );
  }
}
