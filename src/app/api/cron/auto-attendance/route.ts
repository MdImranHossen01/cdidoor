import { NextRequest, NextResponse } from 'next/server';
import { autoFillMissingAttendance } from '@/lib/autoAttendance';
import connectToDatabase from '@/lib/db';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await autoFillMissingAttendance();
    return NextResponse.json({ message: 'Auto attendance filled successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error filling auto attendance:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
