import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;

    // Delete box item
    await prisma.boxItem.deleteMany({
      where: {
        boxId: id,
        itemId,
      },
    });

    // Reorder remaining items
    const remainingItems = await prisma.boxItem.findMany({
      where: { boxId: id },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingItems.length; i++) {
      await prisma.boxItem.update({
        where: { id: remainingItems[i].id },
        data: { order: i },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing item from box:', error);
    return NextResponse.json(
      { error: 'Failed to remove item from box' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const body = await req.json();
    const { quantity, order } = body;

    // Update box item
    await prisma.boxItem.updateMany({
      where: {
        boxId: id,
        itemId,
      },
      data: {
        quantity,
        order,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating box item:', error);
    return NextResponse.json(
      { error: 'Failed to update box item' },
      { status: 500 }
    );
  }
}
