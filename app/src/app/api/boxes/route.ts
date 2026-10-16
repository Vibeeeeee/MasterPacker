import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const search = searchParams.get('search') || '';
    const tagIds = searchParams.getAll('tag');

    // Build where clause
    const where: any = {};
    
    if (parentId === 'null' || parentId === 'root') {
      where.parentBoxId = null;
    } else if (parentId) {
      where.parentBoxId = parentId;
    }

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

    const boxes = await prisma.box.findMany({
      where,
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
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ boxes });
  } catch (error) {
    console.error('Error fetching boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch boxes' },
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
    const { name, description, parentBoxId, tagIds = [] } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check for circular reference
    if (parentBoxId) {
      const parent = await prisma.box.findUnique({
        where: { id: parentBoxId },
      });

      if (!parent) {
        return NextResponse.json(
          { error: 'Parent box not found' },
          { status: 400 }
        );
      }

      // Check if parent would be a child of this box (circular)
      // This is a simplified check - a more thorough one would traverse the tree
    }

    const box = await prisma.box.create({
      data: {
        name,
        description,
        parentBoxId: parentBoxId || null,
        tags: {
          create: tagIds.map((tagId: string) => ({
            tagId,
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({ box }, { status: 201 });
  } catch (error) {
    console.error('Error creating box:', error);
    return NextResponse.json(
      { error: 'Failed to create box' },
      { status: 500 }
    );
  }
}
