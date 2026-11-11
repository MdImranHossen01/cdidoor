import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Banner from '@/models/Banner';
import { auth } from '@/auth';
import mongoose from 'mongoose';
import { deleteFromR2 } from '@/lib/r2';
import { purgeCloudflareCache } from '@/lib/cloudflareCache';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Invalid Banner ID' }, { status: 400 });
    }

    const body = await req.json();
    await connectToDatabase();
    
    const banner = await Banner.findOneAndUpdate({ _id: id }, body, { new: true });
    
    if (!banner) {
      return NextResponse.json({ message: 'Banner not found' }, { status: 404 });
    }

    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on banner update:', err)
    );

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Update Banner Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ message: 'Invalid Banner ID' }, { status: 400 });
    }

    await connectToDatabase();
    
    const banner = await Banner.findOneAndDelete({ _id: id });

    if (!banner) {
      return NextResponse.json({ message: 'Banner not found' }, { status: 404 });
    }

    if (banner.image) {
      deleteFromR2(banner.image).catch((err) =>
        console.error('Failed to delete banner image from R2:', err)
      );
    }

    purgeCloudflareCache().catch((err) =>
      console.error('Failed to purge Cloudflare cache on banner delete:', err)
    );

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Delete Banner Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
