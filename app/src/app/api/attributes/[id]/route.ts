import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const attribute = await prisma.attribute.findUnique({
      where: { id },
      include: {
        itemValues: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!attribute) {
      return NextResponse.json({ error: 'Attribute not found' }, { status: 404 });
    }

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error('Error fetching attribute:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attribute' },
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
    const { name, type, options, isVisible } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if attribute with same name exists (excluding current)
    const existingAttribute = await prisma.attribute.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        id: { not: id },
      },
    });

    if (existingAttribute) {
      return NextResponse.json(
        { error: 'Attribute with this name already exists' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'SELECT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid attribute type' },
        { status: 400 }
      );
    }

    // For SELECT type, options are required
    if (type === 'SELECT' && !options) {
      return NextResponse.json(
        { error: 'Options are required for SELECT type' },
        { status: 400 }
      );
    }

    const attribute = await prisma.attribute.update({
      where: { id },
      data: {
        name,
        type,
        options,
        isVisible,
      },
    });

    return NextResponse.json({ attribute });
  } catch (error) {
    console.error('Error updating attribute:', error);
    return NextResponse.json(
      { error: 'Failed to update attribute' },
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

    // Check if attribute is used by any items
    const itemValues = await prisma.itemAttribute.findMany({
      where: { attributeId: id },
    });

    if (itemValues.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete attribute that is used by items. Remove it from all items first.' },
        { status: 400 }
      );
    }

    await prisma.attribute.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting attribute:', error);
    return NextResponse.json(
      { error: 'Failed to delete attribute' },
      { status: 500 }
    );
  }
}
