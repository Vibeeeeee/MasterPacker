import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tripItemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, tripItemId } = await params;
    const body = await req.json();
    const { quantity, packedBoxId } = body;

    const existing = await prisma.tripItem.findFirst({
      where: { id: tripItemId, tripId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Trip item not found' }, { status: 404 });
    }

    // If packing into a box, verify the box belongs to this trip
    if (packedBoxId) {
      const tripBox = await prisma.tripBox.findFirst({
        where: { tripId: id, boxId: packedBoxId },
      });
      if (!tripBox) {
        return NextResponse.json(
          { error: 'Box is not part of this trip' },
          { status: 400 }
        );
      }
    }

    const tripItem = await prisma.tripItem.update({
      where: { id: tripItemId },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(packedBoxId !== undefined && { packedBoxId: packedBoxId || null }),
      },
      include: {
        item: true,
        packedBox: true,
      },
    });

    return NextResponse.json({ tripItem });
  } catch (error) {
    console.error('Error updating trip item:', error);
    return NextResponse.json(
      { error: 'Failed to update trip item' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tripItemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, tripItemId } = await params;
    await prisma.tripItem.deleteMany({
      where: { id: tripItemId, tripId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing trip item:', error);
    return NextResponse.json(
      { error: 'Failed to remove trip item' },
      { status: 500 }
    );
  }
}
