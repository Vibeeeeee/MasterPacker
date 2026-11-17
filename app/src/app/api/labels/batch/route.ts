import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import {
  renderItemLabelToPng,
  renderBoxLabelToPng,
  renderLabelStripToPng,
  getEffectiveLayout,
} from '@/lib/label-generator';
import { generateLemcFromPng, generateLemcAutocutFromPngs } from '@/lib/lemc-generator';
import { getAppConfig } from '@/lib/auth';
import { getLabelSizeMeta } from '@/lib/label-sizes';

// POST /api/labels/batch
// Body: { type: 'item' | 'box', ids: string[], size: string, format: 'png' | 'strip' | 'lemc' }
export async function POST(req: NextRequest) {
  try {
    const { type, ids, size, format } = await req.json();

    if (!type || !['item', 'box'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No ids provided' }, { status: 400 });
    }

    const meta = getLabelSizeMeta(size || (type === 'box' ? 'MP_BOX_MM24' : 'MP_ITEM_MM24'));
    const { layoutJson, widthMm, heightMm } = await getEffectiveLayout(meta.key);

    const config = await getAppConfig();
    const baseUrl = config.baseUrl || req.nextUrl.origin;

    // Fetch entities with their relations
    const include = {
      tags: { include: { tag: true } },
      ...(type === 'box' ? { boxItems: true } : {}),
    };

    const entities = type === 'item'
      ? await prisma.item.findMany({ where: { id: { in: ids } }, include })
      : await prisma.box.findMany({ where: { id: { in: ids } }, include });

    if (entities.length === 0) {
      return NextResponse.json({ error: 'Nothing found' }, { status: 404 });
    }

    // Render each label to PNG (in the order of the requested ids)
    const ordered = ids
      .map((id: string) => entities.find((e: any) => e.id === id))
      .filter((e: any): e is Record<string, any> => Boolean(e)) as Record<string, any>[];

    const pngBuffers: Buffer[] = [];
    for (const entity of ordered) {
      const qrUrl = `${baseUrl}/${type === 'item' ? 'items' : 'boxes'}/${entity.id}`;
      const png = type === 'item'
        ? await renderItemLabelToPng(entity, meta.key, { widthMm, heightMm, qrUrl, baseUrl, layoutJson })
        : await renderBoxLabelToPng(entity, meta.key, { widthMm, heightMm, qrUrl, baseUrl, layoutJson });
      pngBuffers.push(png);
    }

    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '_') || 'label';

    // ---- PNG: single file, or ZIP when multiple ----
    if (format === 'png') {
      if (pngBuffers.length === 1) {
        return new NextResponse(new Uint8Array(pngBuffers[0]), {
          headers: {
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="label_${safeName(ordered[0].name)}.png"`,
          },
        });
      }

      const zip = new JSZip();
      pngBuffers.forEach((png, i) => {
        zip.file(`label_${i + 1}_${safeName(ordered[i].name)}.png`, png);
      });
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      return new NextResponse(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="labels_${type}_${pngBuffers.length}.zip"`,
        },
      });
    }

    // ---- Strip: one PNG with cut lines ----
    if (format === 'strip') {
      const stripPng = await renderLabelStripToPng(
        ordered.map((entity: any) => ({
          item: entity,
          layoutJson,
          qrUrl: `${baseUrl}/${type === 'item' ? 'items' : 'boxes'}/${entity.id}`,
          widthMm,
        })),
        { heightMm, gapMm: 4, kind: type }
      );
      return new NextResponse(new Uint8Array(stripPng), {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="label_strip_${type}_${ordered.length}.png"`,
        },
      });
    }

    // ---- Epson .lemc: single file, or autocut batch when multiple ----
    if (format === 'lemc') {
      const lemc = pngBuffers.length === 1
        ? await generateLemcFromPng(pngBuffers[0], meta.tapeWidthMm, `label_${safeName(ordered[0].name)}`)
        : await generateLemcAutocutFromPngs(pngBuffers, meta.tapeWidthMm, `labels_${type}_${ordered.length}`);

      return new NextResponse(lemc, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${pngBuffers.length === 1 ? `label_${safeName(ordered[0].name)}` : `labels_${type}_${ordered.length}`}.lemc"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error generating labels:', error);
    return NextResponse.json({ error: 'Failed to generate labels' }, { status: 500 });
  }
}
