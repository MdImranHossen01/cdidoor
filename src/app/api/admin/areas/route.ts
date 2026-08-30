import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Area from '@/models/Area';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const areas = await Area.find().sort({ createdAt: -1 });
    return NextResponse.json(areas);
  } catch (error: any) {
    console.error('Fetch Areas Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !(['admin', 'super_admin', 'manager'].includes((session?.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { name, division, district, thana } = await req.json();
    if (!name || !division) {
      return NextResponse.json({ message: 'Area name and division are mandatory fields' }, { status: 400 });
    }

    await connectToDatabase();
    const newArea = new Area({
      name,
      division,
      district: district || undefined,
      thana: thana || undefined
    });

    await newArea.save();
    return NextResponse.json(newArea, { status: 201 });
  } catch (error: any) {
    console.error('Create Area Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
