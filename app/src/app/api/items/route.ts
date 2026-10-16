import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const tagIds = searchParams.getAll('tag');
    const boxId = searchParams.get('boxId');
    const reorderOnly = searchParams.get('reorderOnly') === 'true';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by tags
    if (tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    // Filter by box
    if (boxId) {
      where.boxItems = {
        some: {
          boxId,
        },
      };
    }

    // Filter by reorder flag
    if (reorderOnly) {
      where.markForReorder = true;
    }

    const items = await prisma.item.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
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

    const body = await req.json();
    const { name, description, markForReorder = false, tagIds = [], attributeValues = {} } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Create item
    const item = await prisma.item.create({
      data: {
        name,
        description,
        markForReorder,
        tags: {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
    });

    // Add attributes
    for (const [attributeId, value] of Object.entries(attributeValues)) {
      await prisma.itemAttribute.create({
        data: {
          itemId: item.id,
          attributeId,
          value: String(value),
        },
      });
    }

    // Fetch full item with relations
    const fullItem = await prisma.item.findUnique({
      where: { id: item.id },
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
        pictures: true,
        boxItems: {
          include: {
            box: true,
          },
        },
      },
    });

    return NextResponse.json({ item: fullItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}
