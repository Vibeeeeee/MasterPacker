import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const links = await prisma.itemLink.findMany({
      where: { itemId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching item links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item links' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { label, url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const count = await prisma.itemLink.count({ where: { itemId: id } });

    const link = await prisma.itemLink.create({
      data: {
        itemId: id,
        label: label || url,
        url,
        order: count,
      },
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Error creating item link:', error);
    return NextResponse.json(
      { error: 'Failed to create item link' },
      { status: 500 }
    );
  }
}
