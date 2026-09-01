import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    
    if (!session || !(['admin', 'super_admin'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role'); // 'admin', 'manager', or all

    await connectToDatabase();

    // System users include admin, manager, showroom_manager
    // Super Admin (imranshuvo101@gmail.com and super_admin) must be hidden
    const allowedRoles = roleFilter && ['admin', 'manager', 'showroom_manager'].includes(roleFilter)
      ? [roleFilter]
      : ['admin', 'manager', 'showroom_manager'];

    const matchQuery: any = {
      role: { $in: allowedRoles, $ne: 'super_admin' },
      email: { $ne: 'imranshuvo101@gmail.com' }
    };

    if (search) {
      matchQuery.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    const totalCount = await User.countDocuments(matchQuery);

    const users = await User.find(matchQuery)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      users,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error: any) {
    console.error('Fetch System Users Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const currentUserRole = (session?.user as any)?.role;
    
    if (!session || (currentUserRole !== 'super_admin' && currentUserRole !== 'admin')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, name, image, phone, password, role = 'admin' } = await req.json();

    if (!email && !phone) {
      return NextResponse.json({ message: 'Email or phone number is required' }, { status: 400 });
    }

    if (email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.[A-Za-z]{2,})+$/.test(email)) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const normalizedPhone = phone ? normalizePhoneNumber(phone) : undefined;

    // Never allow assigning super_admin
    const targetRole = role === 'manager' || role === 'showroom_manager' ? role : 'admin';

    await connectToDatabase();

    const orConditions: any[] = [];
    if (normalizedEmail) orConditions.push({ email: normalizedEmail });
    if (normalizedPhone) orConditions.push({ phone: normalizedPhone });

    let user = await User.findOne({ $or: orConditions });

    if (user) {
      if (user.email === 'imranshuvo101@gmail.com') {
        return NextResponse.json({ message: 'Cannot modify super admin account' }, { status: 403 });
      }

      user.role = targetRole;
      if (name && (!user.name || user.name === 'Admin User')) user.name = name;
      if (image) user.image = image;
      if (password && password.length >= 6) {
        user.password = await bcrypt.hash(password, 10);
      }
      if (normalizedPhone && !user.phone) user.phone = normalizedPhone;
      if (normalizedEmail && !user.email) user.email = normalizedEmail;

      await user.save();

      return NextResponse.json({
        message: `User ${user.name || normalizedEmail || normalizedPhone} is now assigned as ${targetRole}`,
        user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
      });
    }

    let hashedPassword = undefined;
    if (password && password.length >= 6) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    }

    const newSystemUser = await User.create({
      name: name || (targetRole === 'admin' ? 'Admin User' : 'Manager User'),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      role: targetRole,
      image: image || '',
      isSubscriptionActive: true,
      walletBalance: 0,
      cart: [],
      wishlist: []
    });

    return NextResponse.json({
      message: `System User successfully created and assigned as ${targetRole}`,
      user: {
        _id: newSystemUser._id,
        name: newSystemUser.name,
        email: newSystemUser.email,
        phone: newSystemUser.phone,
        role: newSystemUser.role
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create System User Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
