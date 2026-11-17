import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, linkId } = await params;
    const { label, url } = await req.json();

    const existing = await prisma.itemLink.findFirst({
      where: { id: linkId, itemId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const link = await prisma.itemLink.update({
      where: { id: linkId },
      data: {
        ...(label !== undefined && { label }),
        ...(url !== undefined && { url }),
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error updating item link:', error);
    return NextResponse.json(
      { error: 'Failed to update item link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, linkId } = await params;
    await prisma.itemLink.deleteMany({
      where: { id: linkId, itemId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item link:', error);
    return NextResponse.json(
      { error: 'Failed to delete item link' },
      { status: 500 }
    );
  }
}
