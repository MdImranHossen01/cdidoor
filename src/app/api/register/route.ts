import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { normalizePhoneNumber } from '@/lib/utils';


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
    const cleanPhone = phone ? normalizePhoneNumber(phone) : undefined;

    const query: any[] = [];
    if (normalizedEmail) query.push({ email: normalizedEmail });
    if (cleanPhone) query.push({ phone: cleanPhone });

    if (query.length > 0) {
      const existingUser = await User.findOne({ $or: query });

      if (existingUser) {
        // ── Account Upgrade / Merge ─────────────────────────────────────────
        // If a guest account (fake email) exists with the same phone number,
        // and the user is now registering with a real email → upgrade in place.
        const guestDomain = process.env.NEXT_PUBLIC_GUEST_EMAIL_DOMAIN || 'guest.local';
        const isGuestAccount =
          existingUser.email?.endsWith(`@${guestDomain}`) ||
          !existingUser.email;

        const phoneMatches = cleanPhone && existingUser.phone === cleanPhone;
        const realEmailConflict = normalizedEmail && existingUser.email === normalizedEmail;

        if (phoneMatches && isGuestAccount && normalizedEmail && !realEmailConflict) {
          // Upgrade guest account → real account (bcrypt manually — updateOne skips pre-save hook)
          const bcrypt = (await import('bcryptjs')).default;
          const hashedPassword = await bcrypt.hash(password, 12);

          await User.updateOne(
            { _id: existingUser._id },
            {
              $set: {
                email: normalizedEmail,
                password: hashedPassword,
                ...(name ? { name } : {}),
              },
            }
          );

          return NextResponse.json(
            {
              message: 'Account upgraded successfully! Your previous order history has been preserved.',
              userId: existingUser._id,
              upgraded: true,
            },
            { status: 200 }
          );
        }
        // ───────────────────────────────────────────────────────────────────

        // Normal conflict: real account already exists with same email or phone
        return NextResponse.json(
          { message: 'User already exists with this email or phone number.' },
          { status: 409 }
        );
      }
    }

    const bcrypt = (await import('bcryptjs')).default;
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name || cleanPhone || normalizedEmail || '',
      email: normalizedEmail,
      password: hashedPassword,
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
