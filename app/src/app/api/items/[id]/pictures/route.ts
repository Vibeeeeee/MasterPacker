import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import * as sharp from 'sharp';

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
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize image to max 2000px width/height
    const resizedBuffer = await sharp(buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();

    // Get existing pictures count for ordering
    const existingPictures = await prisma.itemPicture.count({
      where: { itemId: id },
    });

    // Save picture
    const picture = await prisma.itemPicture.create({
      data: {
        itemId: id,
        data: resizedBuffer,
        mimeType: file.type,
        filename: file.name,
        order: existingPictures,
      },
    });

    return NextResponse.json({
      picture: {
        id: picture.id,
        mimeType: picture.mimeType,
        filename: picture.filename,
      },
    });
  } catch (error) {
    console.error('Error uploading picture:', error);
    return NextResponse.json(
      { error: 'Failed to upload picture' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pictures = await prisma.itemPicture.findMany({
      where: { itemId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ pictures });
  } catch (error) {
    console.error('Error fetching pictures:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pictures' },
      { status: 500 }
    );
  }
}
