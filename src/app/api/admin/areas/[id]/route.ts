import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Area from '@/models/Area';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();
    
    const area = await Area.findByIdAndDelete(id);
    if (!area) {
      return NextResponse.json({ message: 'Area not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Area deleted successfully' });
  } catch (error: any) {
    console.error('Delete Area Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, division, district, thana } = await req.json();

    if (!name || !division) {
      return NextResponse.json({ message: 'Name and division are required' }, { status: 400 });
    }

    await connectToDatabase();
    
    const area = await Area.findByIdAndUpdate(
      id,
      { name, division, district, thana },
      { new: true }
    );

    if (!area) {
      return NextResponse.json({ message: 'Area not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Area updated successfully', area });
  } catch (error: any) {
    console.error('Update Area Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
