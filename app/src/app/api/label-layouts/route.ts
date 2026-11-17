import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_LAYOUTS, LABEL_SIZES } from '@/lib/label-sizes';
import { getCurrentUser } from '@/lib/auth';

// GET /api/label-layouts — all saved custom layouts
export async function GET() {
  try {
    const layouts = await prisma.labelLayout.findMany();
    return NextResponse.json({ layouts });
  } catch (error) {
    console.error('Error fetching label layouts:', error);
    return NextResponse.json({ error: 'Failed to fetch layouts' }, { status: 500 });
  }
}

// POST /api/label-layouts — save (upsert) a custom layout for a size
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { size, layoutJson, widthMm } = await req.json();

    if (!size || !LABEL_SIZES.some(s => s.key === size)) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }
    if (!layoutJson) {
      return NextResponse.json({ error: 'layoutJson is required' }, { status: 400 });
    }

    // Validate the layout parses
    try {
      const parsed = JSON.parse(layoutJson);
      if (!Array.isArray(parsed)) throw new Error('not an array');
    } catch {
      return NextResponse.json({ error: 'layoutJson must be a JSON array' }, { status: 400 });
    }

    const layout = await prisma.labelLayout.upsert({
      where: { size },
      create: { size, layoutJson, widthMm: widthMm || 35 },
      update: { layoutJson, widthMm: widthMm || 35 },
    });

    return NextResponse.json({ layout });
  } catch (error) {
    console.error('Error saving label layout:', error);
    return NextResponse.json({ error: 'Failed to save layout' }, { status: 500 });
  }
}

// DELETE /api/label-layouts?size=MM24 — reset a size to its default layout
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const size = searchParams.get('size');

    if (!size || !LABEL_SIZES.some(s => s.key === size)) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }

    await prisma.labelLayout.deleteMany({ where: { size } });

    return NextResponse.json({
      layoutJson: DEFAULT_LAYOUTS[size as keyof typeof DEFAULT_LAYOUTS],
    });
  } catch (error) {
    console.error('Error resetting label layout:', error);
    return NextResponse.json({ error: 'Failed to reset layout' }, { status: 500 });
  }
}
