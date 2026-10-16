import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tagClass = await prisma.tagClass.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });

    if (!tagClass) {
      return NextResponse.json({ error: 'Tag class not found' }, { status: 404 });
    }

    return NextResponse.json({ tagClass });
  } catch (error) {
    console.error('Error fetching tag class:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag class' },
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
    const { name, color, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if tag class with same name exists (excluding current)
    const existingTagClass = await prisma.tagClass.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existingTagClass) {
      return NextResponse.json(
        { error: 'Tag class with this name already exists' },
        { status: 400 }
      );
    }

    const tagClass = await prisma.tagClass.update({
      where: { id },
      data: {
        name,
        color,
        order,
      },
    });

    return NextResponse.json({ tagClass });
  } catch (error) {
    console.error('Error updating tag class:', error);
    return NextResponse.json(
      { error: 'Failed to update tag class' },
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

    // Check if tag class has tags
    const tagClass = await prisma.tagClass.findUnique({
      where: { id },
      include: {
        tags: true,
      },
    });

    if (!tagClass) {
      return NextResponse.json({ error: 'Tag class not found' }, { status: 404 });
    }

    if (tagClass.tags.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tag class with tags. Move or delete them first.' },
        { status: 400 }
      );
    }

    await prisma.tagClass.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag class:', error);
    return NextResponse.json(
      { error: 'Failed to delete tag class' },
      { status: 500 }
    );
  }
}
