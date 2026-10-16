import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        parentBox: {
          include: {
            parentBox: true,
          },
        },
        childBoxes: {
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
          orderBy: { name: 'asc' },
        },
        tags: {
          include: {
            tag: {
              include: {
                tagClass: true,
              },
            },
          },
        },
        pictures: {
          orderBy: { order: 'asc' },
        },
        boxItems: {
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
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    return NextResponse.json({ box });
  } catch (error) {
    console.error('Error fetching box:', error);
    return NextResponse.json(
      { error: 'Failed to fetch box' },
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
    const { name, description, parentBoxId, tagIds = [] } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check for circular reference
    if (parentBoxId && parentBoxId !== id) {
      // Check if parent would be a child of this box
      const children = await prisma.box.findMany({
        where: {
          parentBoxId: id,
        },
      });

      if (children.some(child => child.id === parentBoxId)) {
        return NextResponse.json(
          { error: 'Cannot set parent to a child box (circular reference)' },
          { status: 400 }
        );
      }

      // Recursively check deeper children
      const allChildren = await getAllChildren(id);
      if (allChildren.some(child => child.id === parentBoxId)) {
        return NextResponse.json(
          { error: 'Cannot set parent to a child box (circular reference)' },
          { status: 400 }
        );
      }
    }

    // Update box
    await prisma.box.update({
      where: { id },
      data: {
        name,
        description,
        parentBoxId: parentBoxId || null,
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
    });

    // Fetch full box with relations
    const fullBox = await prisma.box.findUnique({
      where: { id },
      include: {
        parentBox: true,
        childBoxes: {
          orderBy: { name: 'asc' },
        },
        tags: {
          include: {
            tag: {
              include: {
                tagClass: true,
              },
            },
          },
        },
        pictures: {
          orderBy: { order: 'asc' },
        },
        boxItems: {
          include: {
            item: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ box: fullBox });
  } catch (error) {
    console.error('Error updating box:', error);
    return NextResponse.json(
      { error: 'Failed to update box' },
      { status: 500 }
    );
  }
}

async function getAllChildren(boxId: string): Promise<any[]> {
  const children = await prisma.box.findMany({
    where: { parentBoxId: boxId },
  });

  const allChildren = [...children];
  for (const child of children) {
    const grandChildren = await getAllChildren(child.id);
    allChildren.push(...grandChildren);
  }

  return allChildren;
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

    // Check if box exists
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        childBoxes: true,
        boxItems: true,
        pictures: true,
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Check if box has children
    if (box.childBoxes.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete box with child boxes. Move or delete them first.' },
        { status: 400 }
      );
    }

    // Check if box has items
    if (box.boxItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete box with items. Move or delete them first.' },
        { status: 400 }
      );
    }

    // Delete all pictures
    await prisma.boxPicture.deleteMany({
      where: { boxId: id },
    });

    // Delete box
    await prisma.box.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting box:', error);
    return NextResponse.json(
      { error: 'Failed to delete box' },
      { status: 500 }
    );
  }
}
