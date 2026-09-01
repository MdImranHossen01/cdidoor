import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';


export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findOne({ _id: session.user.id }).select('-password').lean();

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ message: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { name, image, phone, address, email, password } = data;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ _id: session.user.id });
    
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    user.name = name;
    if (image !== undefined) user.image = image;
    if (phone !== undefined) user.phone = phone;

    if (email && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return NextResponse.json({ message: 'Email already in use' }, { status: 400 });
      }
      user.email = email.toLowerCase();
    }

    if (password) {
      user.password = password;
    }

    if (address) {
      const divisionVal = address.division || '';
      const districtVal = address.district || address.city || '';
      const thanaVal = address.thana || address.state || '';
      const areaVal = address.area || '';
      const streetVal = address.street || '';

      user.division = divisionVal;
      user.district = districtVal;
      user.thana = thanaVal;
      user.area = areaVal;

      if (user.addresses && user.addresses.length > 0) {
        // Update the first address (acting as default)
        user.addresses[0].street = streetVal;
        user.addresses[0].division = divisionVal;
        user.addresses[0].district = districtVal;
        user.addresses[0].thana = thanaVal;
        user.addresses[0].area = areaVal;
        user.addresses[0].city = districtVal;
        user.addresses[0].state = thanaVal;
        user.addresses[0].zipCode = address.zipCode || '';
        user.addresses[0].country = address.country || 'Bangladesh';
      } else {
        // Create new address
        user.addresses = [{
          street: streetVal,
          division: divisionVal,
          district: districtVal,
          thana: thanaVal,
          area: areaVal,
          city: districtVal,
          state: thanaVal,
          zipCode: address.zipCode || '',
          country: address.country || 'Bangladesh',
          isDefault: true
        }];
      }
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json({ message: 'Profile updated successfully', user: userObj }, { status: 200 });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 });
  }
}

