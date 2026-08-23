import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Showroom from '@/models/Showroom';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, image } = body;

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || (user.role !== 'showroom_manager' && user.role !== 'manager')) {
      return NextResponse.json({ message: 'Showroom Manager not found' }, { status: 404 });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (image !== undefined) user.image = image;
    await user.save();

    return NextResponse.json({
      message: 'Showroom Manager updated successfully',
      manager: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Update Showroom Manager Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || (user.role !== 'showroom_manager' && user.role !== 'manager')) {
      return NextResponse.json({ message: 'Showroom Manager not found' }, { status: 404 });
    }

    user.role = 'user';
    await user.save();

    // Remove this manager from any assigned showrooms
    await Showroom.updateMany({ manager: id }, { $unset: { manager: "" } });

    return NextResponse.json({ message: 'Showroom Manager role revoked successfully' });
  } catch (error: any) {
    console.error('Delete Showroom Manager Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
