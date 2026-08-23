import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Showroom from '@/models/Showroom';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Find all users with role 'showroom_manager' or legacy 'manager'
    const managers = await User.find({ role: { $in: ['showroom_manager', 'manager'] } }).select('-password').sort({ createdAt: -1 }).lean();

    // Find all showrooms managed by these managers
    const showrooms = await Showroom.find({ manager: { $in: managers.map(m => m._id) } }).select('name manager').lean();

    // Map showroom name by manager id
    const showroomMap = new Map();
    showrooms.forEach(s => {
      if (s.manager) {
        showroomMap.set(s.manager.toString(), s.name);
      }
    });

    const managersWithShowrooms = managers.map(m => ({
      ...m,
      showroomName: showroomMap.get(m._id.toString()) || 'Not Assigned'
    }));

    return NextResponse.json({ managers: managersWithShowrooms });
  } catch (error: any) {
    console.error('Fetch Showroom Managers Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, phone, image, userId } = body;

    await connectToDatabase();

    let user;

    if (userId) {
      // Assign existing user
      user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      user.role = 'showroom_manager';
      if (phone) user.phone = phone;
      if (image) user.image = image;
      await user.save();
    } else {
      // Create new user
      if (!name || !email || !password) {
        return NextResponse.json({ message: 'Missing required user fields' }, { status: 400 });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return NextResponse.json({ message: 'User with this email already exists' }, { status: 400 });
      }

      user = await User.create({
        name,
        email,
        password, // Pre-save hook hashes this
        phone,
        image,
        role: 'showroom_manager'
      });
    }

    return NextResponse.json({
      message: 'Showroom Manager added successfully',
      manager: user
    });
  } catch (error: any) {
    console.error('Create Showroom Manager Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
