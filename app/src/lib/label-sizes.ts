// Shared label metadata — pure data only, safe to import from client code.

export interface LayoutElement {
  id: string;
  field: string;
  x: number; // mm
  y: number; // mm
  w: number; // mm
  h: number; // mm
  fontSizePt: number;
}

export type LabelSizeKey =
  | 'GRID12'
  | 'MM12'
  | 'MM24'
  | 'STORAGE24'
  | 'MP_ITEM_MM24'
  | 'MP_BOX_MM24';

export interface LabelSizeMeta {
  key: LabelSizeKey;
  name: string;
  kind: 'item' | 'box';
  widthMm: number;
  heightMm: number;
  tapeWidthMm: 12 | 24; // for Epson .lemc export
}

export const LABEL_SIZES: LabelSizeMeta[] = [
  { key: 'GRID12', name: 'Gridfinity 12mm', kind: 'item', widthMm: 35, heightMm: 12, tapeWidthMm: 12 },
  { key: 'MM12', name: '12mm tape', kind: 'item', widthMm: 35, heightMm: 12, tapeWidthMm: 12 },
  { key: 'MM24', name: '24mm tape', kind: 'item', widthMm: 50, heightMm: 24, tapeWidthMm: 24 },
  { key: 'STORAGE24', name: 'Storage 24mm', kind: 'item', widthMm: 35, heightMm: 24, tapeWidthMm: 24 },
  { key: 'MP_ITEM_MM24', name: 'Item label 50×25mm', kind: 'item', widthMm: 50, heightMm: 25, tapeWidthMm: 24 },
  { key: 'MP_BOX_MM24', name: 'Box label 50×25mm', kind: 'box', widthMm: 50, heightMm: 25, tapeWidthMm: 24 },
];

export const DEFAULT_LAYOUTS: Record<LabelSizeKey, string> = {
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

export const DEFAULT_WIDTHS: Record<LabelSizeKey, number> = {
  GRID12: 35,
  MM12: 35,
  MM24: 50,
  STORAGE24: 35,
  MP_ITEM_MM24: 50,
  MP_BOX_MM24: 50,
};

export function getLabelSizeMeta(key: string): LabelSizeMeta {
  return LABEL_SIZES.find(s => s.key === key) || LABEL_SIZES[4]; // default MP_ITEM_MM24
}

// Fields available in the editor per entity kind
export const ITEM_FIELDS = [
  'Name', 'Type', 'Brand', 'Size', 'Norm', 'Shop', 'Drive',
  'LocationBox', 'Notes', 'Comment', 'Identifier', 'Measurement',
  'Primary', 'Secondary', 'Tags', 'QR Code',
];

export const BOX_FIELDS = [
  'Name', 'Type', 'Identifier', 'Comment', 'ItemCount', 'Tags', 'QR Code',
];
