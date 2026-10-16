import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderItemLabelToPng } from '@/lib/label-generator';
import { getAppConfig } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const size = searchParams.get('size') as string || 'MM24';
    const format = searchParams.get('format') as string || 'PNG';

    // Get item
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get app config for base URL
    const config = await getAppConfig();
    const baseUrl = config.baseUrl || req.nextUrl.origin;
    const qrUrl = `${baseUrl}/items/${item.id}`;

    // Render label
    const pngBuffer = await renderItemLabelToPng(item, 'MP_ITEM_MM24', {
      widthMm: 50,
      heightMm: 25,
      qrUrl,
      baseUrl,
    });

    if (format.toUpperCase() === 'PNG') {
      return new NextResponse(pngBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="label_item_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.png"`,
        },
      });
    }

    // For other formats, we'd need additional libraries
    // For now, just return PNG
    return new NextResponse(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="label_item_${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.png"`,
      },
    });
  } catch (error) {
    console.error('Error generating label:', error);
    return NextResponse.json(
      { error: 'Failed to generate label' },
      { status: 500 }
    );
  }
}
