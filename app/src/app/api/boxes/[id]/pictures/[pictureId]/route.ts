import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pictureId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, pictureId } = await params;

    // Delete picture
    await prisma.boxPicture.delete({
      where: { id: pictureId },
    });

    // Reorder remaining pictures
    const remainingPictures = await prisma.boxPicture.findMany({
      where: { boxId: id },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingPictures.length; i++) {
      await prisma.boxPicture.update({
        where: { id: remainingPictures[i].id },
        data: { order: i },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting picture:', error);
    return NextResponse.json(
      { error: 'Failed to delete picture' },
      { status: 500 }
    );
  }
}
