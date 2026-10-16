import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        tagClass: true,
        itemTags: {
          include: {
            item: true,
          },
        },
        boxTags: {
          include: {
            box: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error fetching tag:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag' },
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
    const { name, tagClassId, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if tag with same name exists (excluding current tag)
    const existingTag = await prisma.tag.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      );
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        tagClassId: tagClassId || null,
        color,
      },
      include: {
        tagClass: true,
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Failed to update tag' },
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
    const mergeTagId = (await req.json()).mergeTagId;

    // Get tag with usage
    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        itemTags: true,
        boxTags: true,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // If merging with another tag
    if (mergeTagId && mergeTagId !== id) {
      // Check if merge tag exists
      const mergeTag = await prisma.tag.findUnique({
        where: { id: mergeTagId },
      });

      if (!mergeTag) {
        return NextResponse.json(
          { error: 'Merge tag not found' },
          { status: 400 }
        );
      }

      // Update all item tags to use merge tag
      await prisma.itemTag.updateMany({
        where: { tagId: id },
        data: { tagId: mergeTagId },
      });

      // Update all box tags to use merge tag
      await prisma.boxTag.updateMany({
        where: { tagId: id },
        data: { tagId: mergeTagId },
      });
    }

    // Delete the tag
    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
