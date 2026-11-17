import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tripBoxes = await prisma.tripBox.findMany({
      where: { tripId: id },
      include: { box: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ tripBoxes });
  } catch (error) {
    console.error('Error fetching trip boxes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip boxes' },
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
    const { boxId } = await req.json();

    if (!boxId) {
      return NextResponse.json(
        { error: 'boxId is required' },
        { status: 400 }
      );
    }

    const box = await prisma.box.findUnique({ where: { id: boxId } });
    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    const count = await prisma.tripBox.count({ where: { tripId: id } });

    const tripBox = await prisma.tripBox.create({
      data: {
        tripId: id,
        boxId,
        order: count,
      },
      include: { box: true },
    });

    return NextResponse.json({ tripBox }, { status: 201 });
  } catch (error) {
    console.error('Error adding box to trip:', error);
    return NextResponse.json(
      { error: 'Failed to add box to trip' },
      { status: 500 }
    );
  }
}
