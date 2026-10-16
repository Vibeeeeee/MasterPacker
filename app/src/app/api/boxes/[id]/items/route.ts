import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const boxItems = await prisma.boxItem.findMany({
      where: { boxId: id },
      include: {
        item: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            pictures: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ boxItems });
  } catch (error) {
    console.error('Error fetching box items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch box items' },
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
    const body = await req.json();
    const { itemId, quantity = 1 } = body;

    // Check if box and item exist
    const box = await prisma.box.findUnique({ where: { id } });
    const item = await prisma.item.findUnique({ where: { id: itemId } });

    if (!box || !item) {
      return NextResponse.json(
        { error: 'Box or item not found' },
        { status: 404 }
      );
    }

    // Check if item is already in this box
    const existingBoxItem = await prisma.boxItem.findFirst({
      where: {
        boxId: id,
        itemId: itemId,
      },
    });

    if (existingBoxItem) {
      // Update quantity
      await prisma.boxItem.update({
        where: { id: existingBoxItem.id },
        data: { quantity: existingBoxItem.quantity + quantity },
      });
    } else {
      // Get the highest order in this box
      const maxOrder = await prisma.boxItem.aggregate({
        where: { boxId: id },
        _max: { order: true },
      });

      // Add item to box
      await prisma.boxItem.create({
        data: {
          boxId: id,
          itemId: itemId,
          quantity,
          order: (maxOrder._max.order || 0) + 1,
        },
      });
    }

    // Fetch updated box items
    const boxItems = await prisma.boxItem.findMany({
      where: { boxId: id },
      include: {
        item: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ boxItems }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to box:', error);
    return NextResponse.json(
      { error: 'Failed to add item to box' },
      { status: 500 }
    );
  }
}
