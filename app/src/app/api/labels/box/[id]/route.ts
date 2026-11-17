import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderBoxLabelToPng, getEffectiveLayout } from '@/lib/label-generator';
import { getAppConfig } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const size = searchParams.get('size') || 'MP_BOX_MM24';

    // Get box
    const box = await prisma.box.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        boxItems: true,
      },
    });

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 });
    }

    // Get app config for base URL
    const config = await getAppConfig();
    const baseUrl = config.baseUrl || req.nextUrl.origin;
    const qrUrl = `${baseUrl}/boxes/${box.id}`;

    // Resolve the effective layout (saved custom layout or default)
    const { layoutJson, widthMm, heightMm } = await getEffectiveLayout(size);

    // Render label
    const pngBuffer = await renderBoxLabelToPng(box, size, {
      widthMm,
      heightMm,
      qrUrl,
      baseUrl,
      layoutJson,
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="label_box_${box.name.replace(/[^a-zA-Z0-9]/g, '_')}.png"`,
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
