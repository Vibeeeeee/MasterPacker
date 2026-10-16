import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: {
              include: {
                tagClass: true,
              },
            },
          },
        },
        attributes: {
          include: {
            attribute: true,
          },
        },
        pictures: {
          orderBy: { order: 'asc' },
        },
        boxItems: {
          include: {
            box: {
              include: {
                parentBox: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { name, description, markForReorder, tagIds = [], attributeValues = {} } = body;

    // Update item
    await prisma.item.update({
      where: { id },
      data: {
        name,
        description,
        markForReorder,
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
    });

    // Update attributes
    // First, delete existing attributes
    await prisma.itemAttribute.deleteMany({
      where: { itemId: id },
    });

    // Then create new ones
    for (const [attributeId, value] of Object.entries(attributeValues)) {
      await prisma.itemAttribute.create({
        data: {
          itemId: id,
          attributeId,
          value: String(value),
        },
      });
    }

    // Fetch full item with relations
    const fullItem = await prisma.item.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: {
              include: {
                tagClass: true,
              },
            },
          },
        },
        attributes: {
          include: {
            attribute: true,
          },
        },
        pictures: {
          orderBy: { order: 'asc' },
        },
        boxItems: {
          include: {
            box: true,
          },
        },
      },
    });

    return NextResponse.json({ item: fullItem });
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
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

    // Check if item exists
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        boxItems: true,
        pictures: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Remove from all boxes
    await prisma.boxItem.deleteMany({
      where: { itemId: id },
    });

    // Delete all pictures
    await prisma.itemPicture.deleteMany({
      where: { itemId: id },
    });

    // Delete item
    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
