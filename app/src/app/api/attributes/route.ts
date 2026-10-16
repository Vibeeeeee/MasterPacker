import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ attributes });
  } catch (error) {
    console.error('Error fetching attributes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attributes' },
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
    const { name, type = 'TEXT', options, isVisible = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if attribute with same name exists
    const existingAttribute = await prisma.attribute.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
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

    // Get the highest order
    const maxOrder = await prisma.attribute.aggregate({
      _max: { order: true },
    });

    const attribute = await prisma.attribute.create({
      data: {
        name,
        type,
        options,
        isVisible,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json({ attribute }, { status: 201 });
  } catch (error) {
    console.error('Error creating attribute:', error);
    return NextResponse.json(
      { error: 'Failed to create attribute' },
      { status: 500 }
    );
  }
}
