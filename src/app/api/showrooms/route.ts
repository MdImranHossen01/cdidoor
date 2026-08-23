import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';

export async function GET() {
  try {
    await connectToDatabase();
    const showrooms = await Showroom.find({ isActive: true })
      .select('name address image')
      .sort({ name: 1 });
    return NextResponse.json({ showrooms });
  } catch (error) {
    console.error('Fetch Public Showrooms Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
