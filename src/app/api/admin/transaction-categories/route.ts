import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import TransactionCategory from '@/models/TransactionCategory';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    
    // Check if we need to filter by type
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    
    const query = type ? { type: type as 'expense' | 'income' } : {};
    const categories = await TransactionCategory.find(query).sort({ name: 1 }).lean();
    
    return NextResponse.json(categories, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    const data = await req.json();
    
    if (!data.name || !data.type) {
      return NextResponse.json({ message: 'Name and type are required' }, { status: 400 });
    }
    
    // Check if it already exists to provide a friendly error
    const existing = await TransactionCategory.findOne({ 
      name: { $regex: new RegExp(`^${data.name}$`, 'i') }, 
      type: data.type 
    });
    
    if (existing) {
      return NextResponse.json({ message: `A category named "${data.name}" already exists for ${data.type}` }, { status: 400 });
    }
    
    const category = await TransactionCategory.create(data);
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
