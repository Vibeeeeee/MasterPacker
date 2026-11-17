import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tripItems = await prisma.tripItem.findMany({
      where: { tripId: id },
      include: {
        item: true,
        packedBox: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ tripItems });
  } catch (error) {
    console.error('Error fetching trip items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip items' },
      { status: 500 }
    );
  }
}

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
    const { itemId, quantity = 1, packedBoxId } = await req.json();

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const count = await prisma.tripItem.count({ where: { tripId: id } });

    const tripItem = await prisma.tripItem.create({
      data: {
        tripId: id,
        itemId,
        quantity,
        packedBoxId: packedBoxId || null,
        order: count,
      },
      include: {
        item: true,
        packedBox: true,
      },
    });

    return NextResponse.json({ tripItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to trip:', error);
    return NextResponse.json(
      { error: 'Failed to add item to trip' },
      { status: 500 }
    );
  }
}
