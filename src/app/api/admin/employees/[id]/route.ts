import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import EmployeeProfile from '@/models/EmployeeProfile';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id || (session?.user as any)?._id;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Employees can only access their own record; admins can access any
    if (['employee', 'showroom_manager', 'manager'].includes(userRole) && userId?.toString() !== id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'super_admin', 'employee', 'showroom_manager', 'manager'].includes(userRole)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(id).select('-password');
    if (!user || !['employee', 'showroom_manager', 'manager'].includes(user.role)) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    const profile = await EmployeeProfile.findOne({ user: id }).lean() as any;

    return NextResponse.json({
      employee: {
        ...user.toObject(),
        employeeType: profile?.employeeType || (user.role === 'showroom_manager' || user.role === 'manager' ? 'monthly' : 'monthly'),
        baseSalary: profile?.baseSalary || 0,
        weekendDays: profile?.weekendDays || ['Friday'],
        allowedAbsents: profile?.allowedAbsents ?? 1,
        absentDeductionRate: profile?.absentDeductionRate ?? 0,
        basicSalary: profile?.basicSalary ?? 0,
        allowance: profile?.allowance ?? 0,
        deduction: profile?.deduction ?? 0,
        appointmentLetter: profile?.appointmentLetter || '',
        joinedDate: profile?.joinedDate || user.createdAt,
        status: profile?.status || 'active',
        profile: profile || null,
      }
    });
  } catch (error: any) {
    console.error('Fetch Employee Error:', error);
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
    const { 
      name, phone, image, employeeType, baseSalary, appointmentLetter, joinedDate,
      weekendDays, allowedAbsents, absentDeductionRate, basicSalary, allowance, deduction, status
    } = body;

    await connectToDatabase();

    const user = await User.findById(id);
    if (!user || !['employee', 'showroom_manager', 'manager'].includes(user.role)) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (image !== undefined) user.image = image;
    await user.save();

    let profile = await EmployeeProfile.findOne({ user: id });
    
    // Recalculate baseSalary if monthly
    const targetType = employeeType || profile?.employeeType || 'monthly';
    const hasSalaryUpdate = baseSalary !== undefined || basicSalary !== undefined || allowance !== undefined || deduction !== undefined;
    const computedBaseSalary = hasSalaryUpdate
      ? (targetType === 'monthly'
        ? Math.max(
            0,
            Number(basicSalary !== undefined ? basicSalary : (profile?.basicSalary ?? 0)) +
            Number(allowance !== undefined ? allowance : (profile?.allowance ?? 0)) -
            Number(deduction !== undefined ? deduction : (profile?.deduction ?? 0))
          )
        : 0)
      : (profile?.baseSalary ?? 0);

    if (!profile) {
      profile = await EmployeeProfile.create({
        user: id,
        employeeType: employeeType || 'monthly',
        baseSalary: baseSalary !== undefined ? Number(baseSalary) : computedBaseSalary,
        weekendDays: weekendDays || ['Friday'],
        allowedAbsents: allowedAbsents !== undefined ? Number(allowedAbsents) : 1,
        absentDeductionRate: absentDeductionRate !== undefined ? Number(absentDeductionRate) : 0,
        basicSalary: basicSalary !== undefined ? Number(basicSalary) : 0,
        allowance: allowance !== undefined ? Number(allowance) : 0,
        deduction: deduction !== undefined ? Number(deduction) : 0,
        appointmentLetter: appointmentLetter || '',
        joinedDate: joinedDate ? new Date(joinedDate) : new Date(),
        status: status || 'active'
      });
    } else {
      if (employeeType) profile.employeeType = employeeType;
      
      profile.baseSalary = baseSalary !== undefined ? Number(baseSalary) : computedBaseSalary;
      
      if (weekendDays !== undefined) profile.weekendDays = weekendDays;
      if (allowedAbsents !== undefined) profile.allowedAbsents = Number(allowedAbsents);
      if (absentDeductionRate !== undefined) profile.absentDeductionRate = Number(absentDeductionRate);
      if (basicSalary !== undefined) profile.basicSalary = Number(basicSalary);
      if (allowance !== undefined) profile.allowance = Number(allowance);
      if (deduction !== undefined) profile.deduction = Number(deduction);
      if (appointmentLetter !== undefined) profile.appointmentLetter = appointmentLetter;
      if (joinedDate) profile.joinedDate = new Date(joinedDate);
      if (status !== undefined) profile.status = status;
      await profile.save();
    }

    return NextResponse.json({
      message: 'Employee updated successfully',
      employee: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        image: user.image,
        employeeType: profile.employeeType,
        baseSalary: profile.baseSalary,
        weekendDays: profile.weekendDays,
        allowedAbsents: profile.allowedAbsents,
        absentDeductionRate: profile.absentDeductionRate,
        basicSalary: profile.basicSalary,
        allowance: profile.allowance,
        deduction: profile.deduction,
        appointmentLetter: profile.appointmentLetter,
        joinedDate: profile.joinedDate,
        status: profile.status
      }
    });
  } catch (error: any) {
    console.error('Update Employee Error:', error);
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

    const profile = await EmployeeProfile.findOne({ user: id });
    if (!profile) {
      return NextResponse.json({ message: 'Employee profile not found' }, { status: 404 });
    }

    profile.status = 'discontinued';
    await profile.save();

    return NextResponse.json({ message: 'Employee status changed to discontinued' });
  } catch (error: any) {
    console.error('Delete Employee Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
