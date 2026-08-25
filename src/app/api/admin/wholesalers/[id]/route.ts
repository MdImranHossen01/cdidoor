/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

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
    if (!user || user.role !== 'wholesaler') {
      return NextResponse.json({ message: 'Wholesaler not found' }, { status: 404 });
    }

    // Demote role to standard user
    user.role = 'user';
    await user.save();

    return NextResponse.json({ message: 'Wholesaler status revoked successfully' });
  } catch (error: any) {
    console.error('Delete Wholesaler Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

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
    const { name, email, phone, image, nidImage, tradeLicenseImage } = body;

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || user.role !== 'wholesaler') {
      return NextResponse.json({ message: 'Wholesaler not found' }, { status: 404 });
    }

    if (name) user.name = name;
    if (email) {
      // Check no other account uses this email
      const conflict = await User.findOne({ email, _id: { $ne: id } });
      if (conflict) {
        return NextResponse.json({ message: 'This email is already in use by another account' }, { status: 400 });
      }
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (image !== undefined) user.image = image;
    if (nidImage !== undefined) user.nidImage = nidImage;
    if (tradeLicenseImage !== undefined) user.tradeLicenseImage = tradeLicenseImage;
    await user.save();

    return NextResponse.json({
      message: 'Wholesaler updated successfully',
      wholesaler: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        nidImage: user.nidImage,
        tradeLicenseImage: user.tradeLicenseImage,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Update Wholesaler Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
