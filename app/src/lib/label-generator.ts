import QRCode from 'qrcode';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma';
import {
  DEFAULT_LAYOUTS,
  DEFAULT_WIDTHS,
  type LabelSizeKey,
  type LayoutElement,
} from './label-sizes';

export { DEFAULT_LAYOUTS, DEFAULT_WIDTHS };
export type { LayoutElement, LabelSizeKey };

// Resolve the effective layout for a size: a saved custom layout from the
// database wins, otherwise the built-in default.
export async function getEffectiveLayout(
  size: string
): Promise<{ layoutJson: string; widthMm: number; heightMm: number }> {
  const meta = (await import('./label-sizes')).getLabelSizeMeta(size);
  let layoutJson: string | null = null;
  let widthMm: number | null = null;
  try {
    const saved = await prisma.labelLayout.findUnique({ where: { size } });
    if (saved) {
      layoutJson = saved.layoutJson;
      widthMm = saved.widthMm;
    }
  } catch {
    // fall through to defaults
  }
  return {
    layoutJson: layoutJson || DEFAULT_LAYOUTS[meta.key],
    widthMm: widthMm || meta.widthMm,
    heightMm: meta.heightMm,
  };
}

// Font configuration
const FONT_CONFIG = {
  name: 'Roboto Condensed',
  weight: 700 as const,
  style: 'normal' as const,
};

const MM_TO_PX = 10;
const PT_TO_PX = 3.52777;

function loadFont(): Buffer {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'RobotoCondensed-Bold.ttf');
  
  try {
    return fs.readFileSync(fontPath);
  } catch {
    // Fallback to a default font if Roboto Condensed is not available
    // Try to find any font file
    const publicDir = path.join(process.cwd(), 'public');
    const fontFiles = [
      path.join(publicDir, 'fonts', 'RobotoCondensed-Bold.ttf'),
      path.join(publicDir, 'fonts', 'Roboto-Bold.ttf'),
      path.join(publicDir, 'fonts', 'roboto-bold.ttf'),
      path.join(publicDir, 'Roboto-Bold.ttf'),
    ];
    
    for (const fontFile of fontFiles) {
      try {
        return fs.readFileSync(fontFile);
      } catch {
        // Continue to next
      }
    }
    
    // Return a minimal font buffer if none found
    // This will cause satori to use a default font
    return Buffer.from('');
  }
}

function resolveItemText(item: any, field: string): string {
  switch (field) {
    case 'Name': return item.name || '';
    case 'Type': return item.type || '';
    case 'Brand': return item.brand || '';
    case 'Size': return item.measurement || '';
    case 'Norm': return item.dinNorm || '';
    case 'Shop': return item.shop || '';
    case 'Drive': return item.drive || '';
    case 'LocationBox': return item.locationBox || '';
    case 'Notes': return item.notes || '';
    case 'Comment': return item.comment || '';
    case 'Identifier': return item.identifier || '';
    case 'Measurement': return item.measurement || '';
    case 'Primary': {
      const type = (item.type || '').trim();
      const m = (item.measurement || '').trim();
      if (m && type) return `${m} ${type}`;
      return m || type || (item.name || '').trim() || 'Item';
    }
    case 'Secondary': {
      const norm = (item.dinNorm || '').trim();
      if (norm) return norm;
      const name = (item.name || '').trim();
      const type = (item.type || '').trim();
      if (name && name.toLowerCase() !== type.toLowerCase()) return name;
      return '';
    }
    case 'Tags': {
      if (item.tags && item.tags.length > 0) {
        return item.tags.map((t: any) => t.tag?.name || t.name).join(', ');
      }
      return '';
    }
    case 'QR Code': return ''; // Handled separately
    default: return '';
  }
}

function resolveBoxText(box: any, field: string): string {
  switch (field) {
    case 'Name': return box.name || '';
    case 'Type': return box.description || '';
    case 'Identifier': return box.id.substring(0, 8) || '';
    case 'Comment': return box.description || '';
    case 'ItemCount': {
      const count = box.boxItems?.reduce((sum: number, bi: any) => sum + (bi.quantity || 1), 0) || 0;
      return `${count} ${count === 1 ? 'item' : 'items'}`;
    }
    case 'Tags': {
      if (box.tags && box.tags.length > 0) {
        return box.tags.map((t: any) => t.tag?.name || t.name).join(', ');
      }
      return '';
    }
    case 'QR Code': return ''; // Handled separately
    default: return '';
  }
}

export async function createQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 0, width: 256 });
}

export async function renderItemLabelToPng(
  item: any,
  layoutName: string = 'MP_ITEM_MM24',
  options: { widthMm?: number; heightMm?: number; qrUrl: string; baseUrl?: string; layoutJson?: string } = { qrUrl: '', baseUrl: '' }
): Promise<Buffer> {
  const layoutJson = options.layoutJson || DEFAULT_LAYOUTS[layoutName as keyof typeof DEFAULT_LAYOUTS] || DEFAULT_LAYOUTS.MP_ITEM_MM24;
  const { widthMm = 50, heightMm = 25, qrUrl } = options;

  const width = widthMm * MM_TO_PX;
  const height = heightMm * MM_TO_PX;

  const qrDataUrl = await createQrDataUrl(qrUrl);
  const fontData = loadFont();

  const layout: LayoutElement[] = JSON.parse(layoutJson);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          position: 'relative',
          overflow: 'hidden',
        },
        children: layout.map((el) => {
          if (el.field === 'QR Code') {
            return {
              type: 'img',
              props: {
                src: qrDataUrl,
                style: {
                  position: 'absolute',
                  left: `${el.x * MM_TO_PX}px`,
                  top: `${el.y * MM_TO_PX}px`,
                  width: `${el.w * MM_TO_PX}px`,
                  height: `${el.h * MM_TO_PX}px`,
                },
              },
            };
          }

          const text = resolveItemText(item, el.field);

          return {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${el.x * MM_TO_PX}px`,
                top: `${el.y * MM_TO_PX}px`,
                width: `${el.w * MM_TO_PX}px`,
                height: `${el.h * MM_TO_PX}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                fontSize: `${el.fontSizePt * PT_TO_PX}px`,
                fontWeight: 700,
                color: '#000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontFamily: 'Roboto Condensed',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              },
              children: text,
            },
          };
        }),
      },
    } as any,
    {
      width,
      height,
      fonts: [{ ...FONT_CONFIG, data: fontData }],
    } as any
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 3 },
  });

  return resvg.render().asPng();
}

export async function renderBoxLabelToPng(
  box: any,
  layoutName: string = 'MP_BOX_MM24',
  options: { widthMm?: number; heightMm?: number; qrUrl: string; baseUrl?: string; layoutJson?: string } = { qrUrl: '', baseUrl: '' }
): Promise<Buffer> {
  const layoutJson = options.layoutJson || DEFAULT_LAYOUTS[layoutName as keyof typeof DEFAULT_LAYOUTS] || DEFAULT_LAYOUTS.MP_BOX_MM24;
  const { widthMm = 50, heightMm = 25, qrUrl } = options;

  const width = widthMm * MM_TO_PX;
  const height = heightMm * MM_TO_PX;

  const qrDataUrl = await createQrDataUrl(qrUrl);
  const fontData = loadFont();

  const layout: LayoutElement[] = JSON.parse(layoutJson);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          position: 'relative',
          overflow: 'hidden',
        },
        children: layout.map((el) => {
          if (el.field === 'QR Code') {
            return {
              type: 'img',
              props: {
                src: qrDataUrl,
                style: {
                  position: 'absolute',
                  left: `${el.x * MM_TO_PX}px`,
                  top: `${el.y * MM_TO_PX}px`,
                  width: `${el.w * MM_TO_PX}px`,
                  height: `${el.h * MM_TO_PX}px`,
                },
              },
            };
          }

          const text = resolveBoxText(box, el.field);

          return {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: `${el.x * MM_TO_PX}px`,
                top: `${el.y * MM_TO_PX}px`,
                width: `${el.w * MM_TO_PX}px`,
                height: `${el.h * MM_TO_PX}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                fontSize: `${el.fontSizePt * PT_TO_PX}px`,
                fontWeight: 700,
                color: '#000',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontFamily: 'Roboto Condensed',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              },
              children: text,
            },
          };
        }),
      },
    } as any,
    {
      width,
      height,
      fonts: [{ ...FONT_CONFIG, data: fontData }],
    } as any
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 3 },
  });

  return resvg.render().asPng();
}

export async function renderLabelStripToPng(
  items: { item: any; layoutJson: string; qrUrl: string; widthMm: number }[],
  options: { heightMm: number; gapMm: number; kind?: 'item' | 'box' }
): Promise<Buffer> {
  const { heightMm, gapMm, kind = 'item' } = options;
  const resolveText = kind === 'box' ? resolveBoxText : resolveItemText;

  const itemsCount = items.length;
  if (itemsCount === 0) throw new Error('No items to render');

  const totalWidthMm = items.reduce((sum, it) => sum + it.widthMm, 0) + (gapMm * (itemsCount - 1));
  const width = totalWidthMm * MM_TO_PX;
  const height = heightMm * MM_TO_PX;

  const itemsWithQrData = await Promise.all(
    items.map(async (entry) => {
      const qrDataUrl = await createQrDataUrl(entry.qrUrl);
      return { ...entry, qrDataUrl };
    })
  );

  const fontData = loadFont();

  let currentOffsetMm = 0;

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          position: 'relative',
          overflow: 'hidden',
        },
        children: itemsWithQrData.flatMap((entry, idx) => {
          const layout: LayoutElement[] = JSON.parse(entry.layoutJson);
          const item = entry.item;
          const labelWidthMm = entry.widthMm;
          const leftOffsetMm = currentOffsetMm;
          
          currentOffsetMm += labelWidthMm + gapMm;

          const flatChildren: any[] = [];

          if (idx < itemsCount - 1) {
            flatChildren.push({
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  left: `${(leftOffsetMm + labelWidthMm + (gapMm / 2)) * MM_TO_PX}px`,
                  top: 0,
                  width: '1px',
                  height: `${heightMm * MM_TO_PX}px`,
                  borderLeft: '2px dashed #666',
                },
              },
            });
          }

          layout.forEach((el) => {
            const absLeft = (leftOffsetMm + el.x) * MM_TO_PX;
            const absTop = el.y * MM_TO_PX;

            if (el.field === 'QR Code') {
              flatChildren.push({
                type: 'img',
                props: {
                  src: entry.qrDataUrl,
                  style: {
                    position: 'absolute',
                    left: `${absLeft}px`,
                    top: `${absTop}px`,
                    width: `${el.w * MM_TO_PX}px`,
                    height: `${el.h * MM_TO_PX}px`,
                  },
                },
              });
            } else {
              const text = resolveText(item, el.field);

              flatChildren.push({
                type: 'div',
                props: {
                  style: {
                    position: 'absolute',
                    left: `${absLeft}px`,
                    top: `${absTop}px`,
                    width: `${el.w * MM_TO_PX}px`,
                    height: `${el.h * MM_TO_PX}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    fontSize: `${el.fontSizePt * PT_TO_PX}px`,
                    fontWeight: 700,
                    color: '#000',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    fontFamily: 'Roboto Condensed',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                  },
                  children: text,
                },
              });
            }
          });

          return flatChildren;
        }),
      },
    } as any,
    {
      width,
      height,
      fonts: [{ ...FONT_CONFIG, data: fontData }],
    } as any
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width * 3 },
  });

  return resvg.render().asPng();
}
