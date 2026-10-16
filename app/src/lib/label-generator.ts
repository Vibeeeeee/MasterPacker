import QRCode from 'qrcode';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';

// Layout element type
interface LayoutElement {
  id: string;
  field: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSizePt: number;
}

// Default layouts
const DEFAULT_LAYOUTS = {
  GRID12: JSON.stringify([
    { id: 'qr', field: 'QR Code', x: 24, y: 1, w: 10, h: 10, fontSizePt: 10 },
    { id: 'name', field: 'Name', x: 0.9, y: 1, w: 13.5, h: 5, fontSizePt: 14 },
    { id: 'norm', field: 'Norm', x: 0.9, y: 6, w: 23, h: 2.5, fontSizePt: 7 },
    { id: 'type', field: 'Type', x: 0.9, y: 8.5, w: 23, h: 2.5, fontSizePt: 7 },
    { id: 'drive', field: 'Drive', x: 14.4, y: 1, w: 9.5, h: 5, fontSizePt: 14 },
  ]),
  MM12: JSON.stringify([
    { id: 'qr', field: 'QR Code', x: 24, y: 1, w: 10, h: 10, fontSizePt: 10 },
    { id: 'name', field: 'Name', x: 1.1, y: 0.5, w: 22, h: 6, fontSizePt: 16 },
  ]),
  MM24: JSON.stringify([
    { id: 'qr', field: 'QR Code', x: 29.3, y: 1.8, w: 12.5, h: 12.5, fontSizePt: 12.5 },
    { id: 'name', field: 'Name', x: 8.7, y: 1.8, w: 20.5, h: 12.5, fontSizePt: 29 },
    { id: 'location', field: 'LocationBox', x: 8.7, y: 14.3, w: 33, h: 4.5, fontSizePt: 10.5 },
  ]),
  STORAGE24: JSON.stringify([
    { id: 'id-1', field: 'Identifier', x: 2, y: 2, w: 20, h: 8, fontSizePt: 18 },
    { id: 'id-2', field: 'Type', x: 2, y: 10, w: 20, h: 6, fontSizePt: 10 },
    { id: 'id-3', field: 'Comment', x: 2, y: 17, w: 31, h: 6, fontSizePt: 7 },
    { id: 'id-4', field: 'QR Code', x: 23, y: 2, w: 10, h: 10, fontSizePt: 0 },
  ]),
  // MasterPacker specific layouts
  MP_ITEM_MM24: JSON.stringify([
    { id: 'qr', field: 'QR Code', x: 29.3, y: 1.8, w: 12.5, h: 12.5, fontSizePt: 12.5 },
    { id: 'name', field: 'Name', x: 8.7, y: 1.8, w: 20.5, h: 12.5, fontSizePt: 20 },
    { id: 'tags', field: 'Tags', x: 8.7, y: 14.3, w: 33, h: 4.5, fontSizePt: 8 },
  ]),
  MP_BOX_MM24: JSON.stringify([
    { id: 'qr', field: 'QR Code', x: 29.3, y: 1.8, w: 12.5, h: 12.5, fontSizePt: 12.5 },
    { id: 'name', field: 'Name', x: 8.7, y: 1.8, w: 20.5, h: 8, fontSizePt: 20 },
    { id: 'count', field: 'ItemCount', x: 8.7, y: 9.8, w: 20.5, h: 4.5, fontSizePt: 10 },
    { id: 'tags', field: 'Tags', x: 8.7, y: 14.3, w: 33, h: 4.5, fontSizePt: 8 },
  ]),
};

const DEFAULT_WIDTHS = {
  GRID12: 35,
  MM12: 35,
  MM24: 50,
  STORAGE24: 35,
  MP_ITEM_MM24: 50,
  MP_BOX_MM24: 50,
};

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
  options: { widthMm?: number; heightMm?: number; qrUrl: string; baseUrl?: string } = { qrUrl: '', baseUrl: '' }
): Promise<Buffer> {
  const layoutJson = DEFAULT_LAYOUTS[layoutName as keyof typeof DEFAULT_LAYOUTS] || DEFAULT_LAYOUTS.MP_ITEM_MM24;
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
  options: { widthMm?: number; heightMm?: number; qrUrl: string; baseUrl?: string } = { qrUrl: '', baseUrl: '' }
): Promise<Buffer> {
  const layoutJson = DEFAULT_LAYOUTS[layoutName as keyof typeof DEFAULT_LAYOUTS] || DEFAULT_LAYOUTS.MP_BOX_MM24;
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
  options: { heightMm: number; gapMm: number }
): Promise<Buffer> {
  const { heightMm, gapMm } = options;

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
              const text = resolveItemText(item, el.field);

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

export { DEFAULT_LAYOUTS, DEFAULT_WIDTHS };
