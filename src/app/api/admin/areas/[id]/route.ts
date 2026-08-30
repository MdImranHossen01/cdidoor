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
