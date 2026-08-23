import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import EmployeeProfile from '@/models/EmployeeProfile';
import Attendance from '@/models/Attendance';

export async function autoFillMissingAttendance() {
  try {
    await connectToDatabase();

    // 1. Find all monthly employees (including showroom managers)
    const employees = await User.find({ role: { $in: ['employee', 'showroom_manager', 'manager'] } });
    const employeeIds = employees.map((u) => u._id);
    const profiles = await EmployeeProfile.find({
      user: { $in: employeeIds },
      employeeType: 'monthly' // Only permanent employees
    });

    const monthlyEmpIds = profiles.map(p => p.user.toString());
    const monthlyEmployees = employees.filter(e => monthlyEmpIds.includes(e._id.toString()));
    const profileMap = new Map();
    profiles.forEach((p) => {
      profileMap.set(p.user.toString(), p);
    });

    const today = new Date();
    const tz = 'Asia/Dhaka';
    
    // Scan from start of current month (or up to 35 days ago)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startStr = startOfMonth.toLocaleDateString('sv', { timeZone: tz });
    const endStr = today.toLocaleDateString('sv', { timeZone: tz });

    // Fetch existing attendance logs in bulk for the date range
    const existingLogs = await Attendance.find({
      employee: { $in: monthlyEmpIds },
      date: { $gte: startStr, $lte: endStr }
    });

    const existingSet = new Set(
      existingLogs.map((log) => `${log.employee.toString()}_${log.date}`)
    );

    const recordsToInsert = [];

    for (const emp of monthlyEmployees) {
      const profile = profileMap.get(emp._id.toString());
      const weekendDays = profile?.weekendDays || ['Friday'];
      const joined = profile?.joinedDate ? new Date(profile.joinedDate) : emp.createdAt;

      // Start from joined date or start of month, whichever is later
      const start = new Date(Math.max(startOfMonth.getTime(), joined.getTime()));
      let current = new Date(start);

      // Loop through dates including today
      while (current <= today) {
        const dateStr = current.toLocaleDateString('sv', { timeZone: tz });
        const dayName = current.toLocaleDateString('en-US', { weekday: 'long', timeZone: tz });
        const isWeekend = weekendDays.includes(dayName);

        if (!isWeekend) {
          const key = `${emp._id.toString()}_${dateStr}`;
          if (!existingSet.has(key)) {
            // Default check-in/out times in Asia/Dhaka (+06:00)
            const checkIn = new Date(`${dateStr}T09:00:00+06:00`);
            const checkOut = new Date(`${dateStr}T18:00:00+06:00`);

            recordsToInsert.push({
              employee: emp._id,
              date: dateStr,
              status: 'Present',
              checkIn,
              checkOut,
              autoFilled: true
            });
            existingSet.add(key);
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (recordsToInsert.length > 0) {
      try {
        await Attendance.insertMany(recordsToInsert, { ordered: false });
      } catch (insertError: any) {
        console.warn('Some auto-filled records already existed:', insertError.message);
      }
    }
  } catch (error) {
    console.error('Error in autoFillMissingAttendance:', error);
  }
}
