import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeUsage = searchParams.get('includeUsage') === 'true';

    const tags = await prisma.tag.findMany({
      include: {
        tagClass: true,
        itemTags: includeUsage ? { select: { itemId: true } } : false,
        boxTags: includeUsage ? { select: { boxId: true } } : false,
      },
      orderBy: [
        { tagClass: { order: 'asc' } },
        { order: 'asc' },
        { name: 'asc' },
      ],
    });

    if (includeUsage) {
      const tagsWithUsage = tags.map(tag => ({
        ...tag,
        usageCount: tag.itemTags.length + tag.boxTags.length,
      }));
      return NextResponse.json({ tags: tagsWithUsage });
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
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
    const { name, tagClassId, color = '#808080' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if tag with same name exists
    const existingTag = await prisma.tag.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        tagClassId: tagClassId || null,
        color,
      },
      include: {
        tagClass: true,
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}
