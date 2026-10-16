import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const tagClasses = await prisma.tagClass.findMany({
      include: {
        tags: true,
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ tagClasses });
  } catch (error) {
    console.error('Error fetching tag classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tag classes' },
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
    const { name, color = '#808080' } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if tag class with same name exists
    const existingTagClass = await prisma.tagClass.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingTagClass) {
      return NextResponse.json(
        { error: 'Tag class with this name already exists' },
        { status: 400 }
      );
    }

    // Get the highest order
    const maxOrder = await prisma.tagClass.aggregate({
      _max: { order: true },
    });

    const tagClass = await prisma.tagClass.create({
      data: {
        name,
        color,
        order: (maxOrder._max.order || 0) + 1,
      },
    });

    return NextResponse.json({ tagClass }, { status: 201 });
  } catch (error) {
    console.error('Error creating tag class:', error);
    return NextResponse.json(
      { error: 'Failed to create tag class' },
      { status: 500 }
    );
  }
}
