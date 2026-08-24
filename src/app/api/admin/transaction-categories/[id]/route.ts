import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import TransactionCategory from '@/models/TransactionCategory';
import { auth } from '@/auth';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    const data = await req.json();
    
    // Check if renaming to something that already exists
    if (data.name) {
      const existing = await TransactionCategory.findOne({ 
        _id: { $ne: params.id },
        name: { $regex: new RegExp(`^${data.name}$`, 'i') }, 
        type: data.type 
      });
      
      if (existing) {
        return NextResponse.json({ message: `A category named "${data.name}" already exists for ${data.type}` }, { status: 400 });
      }
    }

    const category = await TransactionCategory.findByIdAndUpdate(params.id, data, { new: true });
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json(category, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await auth();
    if (!session || !session.user || !(['admin', 'super_admin'].includes((session.user as any)?.role))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    
    const category = await TransactionCategory.findByIdAndDelete(params.id);
    if (!category) {
      return NextResponse.json({ message: 'Category not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Category deleted successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
