// Epson Label Editor (.lemc) export — ported from NooFlo/LabelGenerator.
// Generates native Epson label files from rendered PNG buffers.
import sharp from 'sharp';
import { randomUUID } from 'crypto';

const generateUUID = () => randomUUID().toUpperCase();

export async function generateLemcFromPng(
  pngBuffer: Buffer | Uint8Array,
  tapeWidthMm: 12 | 24,
  customFilename?: string
): Promise<string> {
  // 1. Get Image Dimensions from sharp
  const metadata = await sharp(pngBuffer).metadata();
  const width = metadata.width || 1;
  const originalHeight = metadata.height || 1;

  // 2. Set Constants
  const is24mm = tapeWidthMm === 24;
  const printableHeightPts = is24mm ? 51.2 : 28.8;
  const frameHeight = is24mm ? 69.0 : 35.0;
  const topMargin = is24mm ? 8.9 : 3.1;

  // 3. Crop empty margins to prevent Epson from shrinking the 35mm layout
  const printableHeightMm = printableHeightPts / 2.8346;
  const pxPerMm = originalHeight / tapeWidthMm;
  const targetHeightPx = Math.floor(printableHeightMm * pxPerMm);
  const finalHeightPx = Math.min(originalHeight, targetHeightPx);
  const topCrop = Math.max(0, Math.floor((originalHeight - finalHeightPx) / 2));

  const croppedBuffer = await sharp(pngBuffer)
    .extract({ left: 0, top: topCrop, width: width, height: finalHeightPx })
    .toBuffer();

  const aspectRatio = width / finalHeightPx;

  // 4. Calculate Dynamic Widths
  const pointWidth = printableHeightPts * aspectRatio;
  const savedLengthMm = pointWidth / 2.8346 + 6.0;

  // 5. Flatten PNG to JPG and Base64 encode
  const jpegBuffer = await sharp(croppedBuffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency
    .jpeg({ quality: 100 })
    .toBuffer();

  let base64Image = jpegBuffer.toString('base64');
  base64Image = base64Image.replace(/\//g, '\\/'); // Escape slashes

  // 5. Build Local Time Date String expected by Epson ("YYYY\/MM\/DD HH:MM")
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  const dateStr = `${yyyy}\\/${mm}\\/${dd} ${hh}:${mins}`;

  // Default Filename logic
  let fileName = customFilename || `Label_${yyyy}${mm}${dd}_${hh}${mins}`;
  if (!fileName.toLowerCase().endsWith('.lemc')) {
    fileName += '.lemc';
  }

  // 6. Construct Payload (Schema strictly matches Epson requirements)
  const lemcPayload = {
    documentSource: 0,
    keywords: '',
    documentType: 0,
    category: '',
    currentPage: 0,
    fileName: fileName,
    tableHeader: [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK',
      'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX',
    ],
    savedLength: savedLengthMm,
    textWords: '',
    version: '2.0.0',
    date: dateStr,
    documents: [
      {
        SettingsBackgroundColorName: '白',
        SettingsFixedLength: 283.46456692913387,
        SettingsTapeWidth: tapeWidthMm,
        SettingsAutoLength: true,
        MultiplePage: false,
        SettingsTapeVertical: false,
        SettingsTopMargin: topMargin,
        SettingsBottomMargin: topMargin,
        PourMode: false,
        SettingsForegroundColor: [0, 0, 0, 1],
        SettingsForegroundColorName: '黒',
        SettingsBackgroundColor: [1, 1, 1, 1],
        SettingsMargin: 8.5039370078740166,
        frame: [0, 0, pointWidth + 17, frameHeight],
        identifier: generateUUID(),
        printableFrame: [0, 0, pointWidth, printableHeightPts],
        SettingsPrintableArea: printableHeightPts,
        name: 'Tape',
        drawers: [
          {
            frame: [0, topMargin, pointWidth, printableHeightPts],
            tapeTapeFrame: [0, 0, 0, 0],
            imageTransparent: false,
            tapeForegroundColor: [0, 0, 0, 1],
            BIType: 0,
            invert: false,
            BILineWidth: 0,
            imageOffset: 18,
            Rotate: 0,
            BILineWidhValue: 0.69999999999999996,
            identifier: generateUUID(),
            tapeBackgroundColor: [1, 1, 1, 1],
            isaacIdentifier: '',
            imageThreshold: 128,
            imageBlock: 210,
            BILineStyle: 1,
            imageName: '',
            BILineThickness: 0,
            imageKind: 0,
            tapeVertical: false,
            type: 'image',
            frameTop: false,
            imageMode: 2,
            image: base64Image,
          },
        ],
      },
    ],
    CatalogTitleEN: '',
    os: 'Mac',
    CatalogTitle: '',
    tableData: [],
    keywordsEN: '',
  };

  // 7. Output exactly as one unformatted string (minified)
  return JSON.stringify(lemcPayload);
}

export async function generateLemcAutocutFromPngs(
  pngBuffers: (Buffer | Uint8Array)[],
  tapeWidthMm: 12 | 24,
  customFilename?: string
): Promise<string> {
  const is24mm = tapeWidthMm === 24;
  const printableHeightPts = is24mm ? 51.2 : 28.8;
  const frameHeight = is24mm ? 69.0 : 35.0;
  const topMargin = is24mm ? 8.9 : 3.1;
  const cutMarginPts = 2.8346456692913384; // 1mm

  const documentsArray: any[] = [];
  let firstLabelLengthMm = 0;

  for (let i = 0; i < pngBuffers.length; i++) {
    const pngBuffer = pngBuffers[i];

    // 1. Get Image Dimensions
    const metadata = await sharp(pngBuffer).metadata();
    const width = metadata.width || 1;
    const originalHeight = metadata.height || 1;

    // 2. Crop empty margins to prevent Epson from shrinking
    const printableHeightMm = printableHeightPts / 2.8346;
    const pxPerMm = originalHeight / tapeWidthMm;
    const targetHeightPx = Math.floor(printableHeightMm * pxPerMm);
    const finalHeightPx = Math.min(originalHeight, targetHeightPx);
    const topCrop = Math.max(0, Math.floor((originalHeight - finalHeightPx) / 2));

    const croppedBuffer = await sharp(pngBuffer)
      .extract({ left: 0, top: topCrop, width: width, height: finalHeightPx })
      .toBuffer();

    const aspectRatio = width / finalHeightPx;
    const pointWidth = printableHeightPts * aspectRatio;

    if (i === 0) {
      firstLabelLengthMm = pointWidth / 2.834645;
    }

    // 3. Flatten PNG to JPG and Base64 encode
    const jpegBuffer = await sharp(croppedBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency
      .jpeg({ quality: 100 })
      .toBuffer();

    let base64Image = jpegBuffer.toString('base64');
    base64Image = base64Image.replace(/\//g, '\\/'); // Escape slashes

    // 4. Build individual document object
    documentsArray.push({
      SettingsBackgroundColorName: '白',
      SettingsFixedLength: 283.46456692913387,
      SettingsTapeWidth: tapeWidthMm,
      SettingsAutoLength: true,
      MultiplePage: true, // CRITICAL
      SettingsTapeVertical: false,
      SettingsTopMargin: topMargin,
      SettingsBottomMargin: topMargin,
      PourMode: false,
      SettingsForegroundColor: [0, 0, 0, 1],
      SettingsForegroundColorName: '黒',
      SettingsBackgroundColor: [1, 1, 1, 1],
      SettingsMargin: cutMarginPts, // 1mm cut margin
      frame: [0, 0, pointWidth + cutMarginPts * 2, frameHeight],
      identifier: generateUUID(),
      printableFrame: [0, 0, pointWidth, printableHeightPts],
      SettingsPrintableArea: printableHeightPts,
      name: 'Tape',
      drawers: [
        {
          frame: [0, topMargin, pointWidth, printableHeightPts],
          tapeTapeFrame: [0, 0, 0, 0],
          imageTransparent: false,
          tapeForegroundColor: [0, 0, 0, 1],
          BIType: 0,
          invert: false,
          BILineWidth: 0,
          imageOffset: 18,
          Rotate: 0,
          BILineWidhValue: 0.69999999999999996,
          identifier: generateUUID(),
          tapeBackgroundColor: [1, 1, 1, 1],
          isaacIdentifier: '',
          imageThreshold: 128,
          imageBlock: 210,
          BILineStyle: 1,
          imageName: '',
          BILineThickness: 0,
          imageKind: 0,
          tapeVertical: false,
          type: 'image',
          frameTop: false,
          imageMode: 2,
          image: base64Image,
        },
      ],
    });
  }

  // 5. Build Local Time Date String expected by Epson
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  const dateStr = `${yyyy}\\/${mm}\\/${dd} ${hh}:${mins}`;

  // Default Filename logic
  let fileName = customFilename || `BatchLabel_${yyyy}${mm}${dd}_${hh}${mins}`;
  if (!fileName.toLowerCase().endsWith('.lemc')) {
    fileName += '.lemc';
  }

  // 6. Construct Root JSON Payload
  const lemcPayload = {
    documentSource: 0,
    keywords: '',
    documentType: 0,
    category: '',
    currentPage: 0,
    fileName: fileName,
    tableHeader: [
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK',
      'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX',
    ],
    savedLength: firstLabelLengthMm,
    textWords: '',
    version: '2.0.0',
    date: dateStr,
    documents: documentsArray,
    CatalogTitleEN: '',
    os: 'Mac',
    CatalogTitle: '',
    tableData: [],
    keywordsEN: '',
  };

  // 7. Output exactly as one unformatted string
  return JSON.stringify(lemcPayload);
}
