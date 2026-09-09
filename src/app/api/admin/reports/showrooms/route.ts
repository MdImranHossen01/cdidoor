import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';

export async function GET() {
  try {
    await connectToDatabase();
    const showrooms = await Showroom.find({ isActive: true }, '_id name address').sort({ name: 1 }).lean();
    return NextResponse.json({
      showrooms: showrooms.map((s: any) => ({
        value: String(s._id),
        label: s.name,
      })),
    });
  } catch (err: any) {
    console.error('[report/showrooms]', err);
    return NextResponse.json({ error: 'Failed to fetch showrooms' }, { status: 500 });
  }
}
