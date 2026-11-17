import { NextRequest, NextResponse } from 'next/server';
import { renderItemLabelToPng, renderBoxLabelToPng } from '@/lib/label-generator';
import { getAppConfig } from '@/lib/auth';
import { getLabelSizeMeta } from '@/lib/label-sizes';

// POST /api/labels/preview
// Body: { type: 'item' | 'box', size: string, layoutJson?: string }
// Renders a label with sample data so the editor can show a live preview.
export async function POST(req: NextRequest) {
  try {
    const { type, size, layoutJson } = await req.json();
    const meta = getLabelSizeMeta(size || 'MP_ITEM_MM24');

    const config = await getAppConfig();
    const baseUrl = config.baseUrl || req.nextUrl.origin;

    const sampleItem = {
      name: 'Headlamp',
      type: 'Light',
      brand: 'Petzl',
      measurement: '200g',
      dinNorm: 'IPX4',
      shop: 'REI',
      drive: 'AAA',
      locationBox: 'Camp Kitchen Box',
      notes: 'Bring spare batteries',
      comment: 'Top shelf',
      identifier: 'ITEM-0123',
      tags: [{ tag: { name: 'Camping' } }, { tag: { name: 'Electronics' } }],
    };

    const sampleBox = {
      id: 'cmwl0000sample0000',
      name: 'Camp Kitchen Box',
      description: 'Stove, fuel, cookset',
      boxItems: [{ quantity: 1 }, { quantity: 2 }],
      tags: [{ tag: { name: 'Camping' } }],
    };

    const qrUrl = `${baseUrl}/${type === 'box' ? 'boxes' : 'items'}/sample`;

    const png = type === 'box'
      ? await renderBoxLabelToPng(sampleBox, meta.key, {
          widthMm: meta.widthMm, heightMm: meta.heightMm, qrUrl, baseUrl, layoutJson,
        })
      : await renderItemLabelToPng(sampleItem, meta.key, {
          widthMm: meta.widthMm, heightMm: meta.heightMm, qrUrl, baseUrl, layoutJson,
        });

    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error) {
    console.error('Error previewing label:', error);
    return NextResponse.json({ error: 'Failed to preview label' }, { status: 500 });
  }
}
