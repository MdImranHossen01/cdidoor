/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole || '')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const division = searchParams.get('division');
    const district = searchParams.get('district');
    const thana = searchParams.get('thana');
    const area = searchParams.get('area');

    await connectToDatabase();

    // Find all users with role 'wholesaler' with optional geo filters
    const matchQuery: any = { role: 'wholesaler' };
    if (division) {
      matchQuery.$or = [{ division }, { 'addresses.division': division }];
    }
    if (district) {
      matchQuery.$or = [{ district }, { 'addresses.district': district }];
    }
    if (thana) {
      matchQuery.$or = [{ thana }, { 'addresses.thana': thana }];
    }
    if (area) {
      matchQuery.$or = [{ area }, { 'addresses.area': area }];
    }

    const wholesalersList = await User.find(matchQuery).select('-password').sort({ createdAt: -1 }).lean() as any[];

    // Calculate order metrics and total credit due for each wholesaler
    const wholesalers = await Promise.all(
      wholesalersList.map(async (w) => {
        const allOrders = await Order.find({
          user: w._id,
          deletedAt: null
        }).select('totalAmount paymentMethod paymentStatus paidAmount');

        const orderCount = allOrders.length;
        const totalOrderValue = allOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

        const totalDue = allOrders
          .filter((o: any) => o.paymentMethod === 'Credit' && o.paymentStatus !== 'Paid')
          .reduce((sum: number, o: any) => sum + ((o.totalAmount || 0) - (o.paidAmount || 0)), 0);

        return {
          ...w,
          totalDue,
          orderCount,
          totalOrderValue
        };
      })
    );

    return NextResponse.json({ wholesalers });
  } catch (error: any) {
    console.error('Fetch Wholesalers Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as { role?: string })?.role;

    if (!session || !['admin', 'super_admin'].includes(userRole || '')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      image,
      nidImage,
      tradeLicenseImage,
      division,
      district,
      thana,
      area,
      address
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const addressObj = {
      street: address || '',
      division: division || '',
      district: district || '',
      thana: thana || '',
      area: area || '',
      isDefault: true
    };

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      if (user.role === 'wholesaler') {
        return NextResponse.json({ message: 'Wholesaler with this email already exists' }, { status: 400 });
      }
      // Only allow upgrading plain user accounts
      if (user.role !== 'user') {
        return NextResponse.json({ message: 'This account cannot be assigned wholesaler status' }, { status: 400 });
      }
      user.role = 'wholesaler';
      if (name) user.name = name;
      if (phone) user.phone = phone;
      if (image) user.image = image;
      if (nidImage) user.nidImage = nidImage;
      if (tradeLicenseImage) user.tradeLicenseImage = tradeLicenseImage;
      if (division !== undefined) user.division = division;
      if (district !== undefined) user.district = district;
      if (thana !== undefined) user.thana = thana;
      if (area !== undefined) user.area = area;
      if (division || district || thana || area || address) {
        user.addresses = [addressObj];
      }
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password,
        phone,
        image,
        nidImage,
        tradeLicenseImage,
        division: division || '',
        district: district || '',
        thana: thana || '',
        area: area || '',
        addresses: [addressObj],
        role: 'wholesaler'
      });
    }

    return NextResponse.json({
      message: 'Wholesaler registered successfully',
      wholesaler: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        nidImage: user.nidImage,
        tradeLicenseImage: user.tradeLicenseImage,
        division: user.division,
        district: user.district,
        thana: user.thana,
        area: user.area,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error: any) {
    console.error('Create Wholesaler Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
