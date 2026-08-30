import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';


export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, address, division, district, thana } = await req.json();

    if (!password || (!email && !phone)) {
      return NextResponse.json(
        { message: 'Password and either email or phone are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const cleanPhone = phone ? phone.trim() : undefined;

    const query: any[] = [];
    if (normalizedEmail) query.push({ email: normalizedEmail });
    if (cleanPhone) query.push({ phone: cleanPhone });

    if (query.length > 0) {
      const existingUser = await User.findOne({ $or: query });
      if (existingUser) {
        return NextResponse.json(
          { message: 'User already exists with this email or phone number.' },
          { status: 409 }
        );
      }
    }

    const user = await User.create({
      name: name || cleanPhone || normalizedEmail || '',
      email: normalizedEmail,
      password,
      phone: cleanPhone,
      addresses: [{
        street: address,
        division: division,
        state: district,
        city: thana,
        country: 'Bangladesh',
        isDefault: true
      }],
      role: 'user',
    });

    return NextResponse.json(
      { message: 'User registered successfully!', userId: user._id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { message: 'Failed to register user.' },
      { status: 500 }
    );
  }
}

