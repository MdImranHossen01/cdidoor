/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import Expense from '@/models/Expense';
import Showroom from '@/models/Showroom';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    if (!session || !(['admin', 'super_admin', 'manager', 'showroom_manager'].includes(userRole))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const showroomParam = searchParams.get('showroom'); // 'all' or a specific showroom ObjectId

    // Default range: Last 30 days
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    const defaultTo = new Date();

    let startDate = defaultFrom;
    if (from) {
      const parsedFrom = new Date(from);
      if (!isNaN(parsedFrom.getTime())) {
        startDate = new Date(Date.UTC(parsedFrom.getUTCFullYear(), parsedFrom.getUTCMonth(), parsedFrom.getUTCDate()));
      }
    } else {
      startDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() - 30));
    }

    let endDate = defaultTo;
    if (to) {
      const parsedTo = new Date(to);
      if (!isNaN(parsedTo.getTime())) {
        endDate = new Date(Date.UTC(parsedTo.getUTCFullYear(), parsedTo.getUTCMonth(), parsedTo.getUTCDate(), 23, 59, 59, 999));
      }
    } else {
      endDate = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999));
    }

    await connectToDatabase();

    // Build showroom filter
    // showroomParam: 'all' = everything, 'online' = no showroom (online/central), ObjectId = specific showroom
    if (showroomParam && showroomParam !== 'all' && showroomParam !== 'online' && !mongoose.Types.ObjectId.isValid(showroomParam)) {
      return NextResponse.json({ error: 'Invalid showroom parameter' }, { status: 400 });
    }
    const isOnlineFilter = showroomParam === 'online';
    const isShowroomFiltered = showroomParam && showroomParam !== 'all' && !isOnlineFilter && mongoose.Types.ObjectId.isValid(showroomParam);
    const showroomObjId = isShowroomFiltered ? new mongoose.Types.ObjectId(showroomParam!) : null;

    // For specific showroom: match that showroom. For online: match null showroom. For all: no filter.
    const onlineOrderFilter = { $or: [{ showroom: { $exists: false } }, { showroom: null }] };
    const orderShowroomFilter: any = isShowroomFiltered
      ? { showroom: showroomObjId }
      : isOnlineFilter
        ? onlineOrderFilter
        : {};
    const expenseShowroomFilter: any = isShowroomFiltered
      ? { showroom: showroomObjId }
      : isOnlineFilter
        ? onlineOrderFilter
        : {};

    // Fetch all showrooms for the response
    const allShowrooms = await Showroom.find({}).select('_id name').lean();

    // 1 & 2. Total Revenue, COGS, and Sales Count (Delivered Orders)
    const revenueStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
          ...orderShowroomFilter
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalDeliveryCharge: { $sum: '$deliveryCharge' },
          salesCount: { $sum: 1 },
          totalCOGS: {
            $sum: {
              $sum: {
                $map: {
                  input: '$items',
                  as: 'item',
                  in: { $multiply: ['$$item.quantity', { $ifNull: ['$$item.purchasePrice', 0] }] }
                }
              }
            }
          }
        }
      }
    ]);

    const {
      totalRevenue = 0,
      totalDeliveryCharge = 0,
      salesCount = 0,
      totalCOGS = 0
    } = revenueStats[0] || {};

    // 3. Expenses & Incomes
    const expenseStats = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: { $ne: 'income' },
          status: 'Approved',
          ...expenseShowroomFilter
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);
    const totalExpenses = expenseStats[0]?.totalExpenses || 0;

    const incomeStats = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: 'income',
          status: 'Approved',
          ...expenseShowroomFilter
        }
      },
      {
        $group: {
          _id: null,
          totalIncomes: { $sum: '$amount' }
        }
      }
    ]);
    const totalIncomes = incomeStats[0]?.totalIncomes || 0;

    // 4. Calculations
    const grossProfit = totalRevenue - totalCOGS - totalDeliveryCharge;
    const netProfit = grossProfit + totalIncomes - totalExpenses;

    // 5. Total Customers (Only users with role 'user')
    const totalUsers = await User.countDocuments({
      role: 'user'
    });

    // 6. Pending Orders (Total, not date filtered)
    const pendingOrdersCount = await Order.countDocuments({ status: 'Order Placed', deletedAt: null, ...orderShowroomFilter });

    // 7. Recent Orders
    const recentOrders = await Order.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('slug totalAmount status createdAt')
      .populate('user', 'name email');

    // 8. Low Stock Products
    const lowStockProducts = await Product.find({ stock: { $lt: 5 } })
      .limit(5)
      .select('name stock price');

    // 9. Loyalty Stats
    const activeSubscribers = await User.countDocuments({ isSubscriptionActive: true });
    const totalWalletBalanceResult = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$walletBalance' } } }
    ]);
    const totalWalletTokens = totalWalletBalanceResult[0]?.total || 0;

    // 10. Top Selling Products
    const topSellingProducts = await Order.aggregate([
      { $match: { status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null, ...orderShowroomFilter } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // 11. Top Customers
    const topCustomers = await Order.aggregate([
      { $match: { status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] }, createdAt: { $gte: startDate, $lte: endDate }, deletedAt: null, ...orderShowroomFilter } },
      {
        $group: {
          _id: '$user',
          totalSpend: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpend: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData'
        }
      },
      { $unwind: '$userData' },
      {
        $project: {
          name: '$userData.name',
          email: '$userData.email',
          totalSpend: 1,
          orderCount: 1
        }
      }
    ]);



    // 13. New vs Returning (Sample simplified logic)
    const allUsersWithOrders = await Order.aggregate([
      {
        $match: {
          deletedAt: null,
          createdAt: { $gte: startDate, $lte: endDate },
          ...orderShowroomFilter
        }
      },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);
    const returningUsersCount = allUsersWithOrders.filter(u => u.count > 1).length;
    const newUsersCount = allUsersWithOrders.filter(u => u.count === 1).length;

    // 14. Chart Data & Simple Forecast
    const showrooms = await Showroom.find({}).lean();
    const showroomMap: Record<string, string> = {};
    showrooms.forEach((s: any) => {
      showroomMap[s._id.toString()] = s.name;
    });

    const ordersData = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
          createdAt: { $gte: startDate, $lte: endDate },
          deletedAt: null,
          ...orderShowroomFilter
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            showroom: '$showroom'
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    const expensesIncomesData = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: 'Approved',
          ...expenseShowroomFilter
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            showroom: '$showroom',
            type: '$type'
          },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    const mergedData: Record<string, any> = {};
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / dayMs);
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate.getTime() + i * dayMs);
      const dateStr = d.toISOString().split('T')[0];
      mergedData[dateStr] = {
        date: dateStr,
        revenue: 0,
        orders: 0,
        expense: 0,
        income: 0,
        showroomBreakdown: {}
      };
    }

    ordersData.forEach((item: any) => {
      const dateStr = item._id.date;
      if (!mergedData[dateStr]) return;
      
      const showroomId = item._id.showroom ? item._id.showroom.toString() : null;
      const showroomName = showroomId ? (showroomMap[showroomId] || 'Unknown Showroom') : 'Direct/Online';
      
      const revenue = item.revenue || 0;
      const orders = item.orders || 0;

      mergedData[dateStr].revenue += revenue;
      mergedData[dateStr].orders += orders;

      if (!mergedData[dateStr].showroomBreakdown[showroomName]) {
        mergedData[dateStr].showroomBreakdown[showroomName] = { revenue: 0, orders: 0, expense: 0, income: 0 };
      }
      mergedData[dateStr].showroomBreakdown[showroomName].revenue += revenue;
      mergedData[dateStr].showroomBreakdown[showroomName].orders += orders;
    });

    expensesIncomesData.forEach((item: any) => {
      const dateStr = item._id.date;
      if (!mergedData[dateStr]) return;

      const showroomId = item._id.showroom ? item._id.showroom.toString() : null;
      const showroomName = showroomId ? (showroomMap[showroomId] || 'Unknown Showroom') : 'Head Office';

      const amount = item.amount || 0;
      const isIncome = item._id.type === 'income';

      if (isIncome) {
        mergedData[dateStr].income += amount;
      } else {
        mergedData[dateStr].expense += amount;
      }

      if (!mergedData[dateStr].showroomBreakdown[showroomName]) {
        mergedData[dateStr].showroomBreakdown[showroomName] = { revenue: 0, orders: 0, expense: 0, income: 0 };
      }
      if (isIncome) {
        mergedData[dateStr].showroomBreakdown[showroomName].income += amount;
      } else {
        mergedData[dateStr].showroomBreakdown[showroomName].expense += amount;
      }
    });

    const chartData = Object.values(mergedData).sort((a: any, b: any) => a.date.localeCompare(b.date));



    // Calculate credit receivables
    const creditOrderQuery: any = {
      paymentMethod: 'Credit',
      paymentStatus: { $ne: 'Paid' },
      status: { $nin: ['Cancelled', 'Order Placed'] },
      deletedAt: null,
      ...orderShowroomFilter
    };
    const creditOrders = await Order.find(creditOrderQuery).populate('user', 'name email phone').lean() as any[];

    const totalWholesalerDue = creditOrders.reduce((sum: number, o: any) => {
      const outstanding = (o.totalAmount || 0) - (o.couponDiscountAmount || 0) - (o.walletAmountUsed || 0);
      return sum + outstanding;
    }, 0);

    const todayDate = new Date();
    const maturedReceivableRaw = creditOrders.reduce((sum: number, o: any) => {
      if (o.expectedPaymentDate && new Date(o.expectedPaymentDate) < todayDate) {
        const outstanding = (o.totalAmount || 0) - (o.couponDiscountAmount || 0) - (o.walletAmountUsed || 0);
        return sum + outstanding;
      }
      return sum;
    }, 0);

    const Bill = (await import('@/models/Bill')).default;
    const billQuery: any = { documentType: 'bill', status: 'Due' };
    if (isShowroomFiltered) billQuery.showroom = showroomObjId;
    const dueBills = await Bill.find(billQuery).lean() as any[];
    const totalBillDue = dueBills.reduce((sum: number, b: any) => sum + (b.currentBillDue || 0), 0);
    const maturedBillDueRaw = dueBills.reduce((sum: number, b: any) => {
      if (b.expectedReceivableDate && new Date(b.expectedReceivableDate) < todayDate) {
        return sum + (b.currentBillDue || 0);
      }
      return sum;
    }, 0);

    // Fetch Ledger balances
    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
    const ledgerAccounts = await LedgerAccount.find().lean() as any[];
    const cashAccount = ledgerAccounts.find((a: any) => a.code === 'CASH');
    const bankAccount = ledgerAccounts.find((a: any) => a.code === 'BANK');
    const apAccount = ledgerAccounts.find((a: any) => a.code === 'AP');

    let cashBalance = cashAccount ? cashAccount.currentBalance : 0;
    let bankBalance = bankAccount ? bankAccount.currentBalance : 0;
    let supplierPayable = apAccount ? apAccount.currentBalance : 0;

    // If showroom is filtered, compute per-showroom cash/bank from ledger transactions
    if (isShowroomFiltered && cashAccount) {
      const cashTxResult = await LedgerTransaction.aggregate([
        { $match: { account: cashAccount._id, showroom: showroomObjId } },
        {
          $group: {
            _id: null,
            net: {
              $sum: {
                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', { $multiply: ['$amount', -1] }]
              }
            }
          }
        }
      ]);
      cashBalance = cashTxResult[0]?.net ?? 0;
    }

    if (isShowroomFiltered && bankAccount) {
      const bankTxResult = await LedgerTransaction.aggregate([
        { $match: { account: bankAccount._id, showroom: showroomObjId } },
        {
          $group: {
            _id: null,
            net: {
              $sum: {
                $cond: [{ $eq: ['$type', 'debit'] }, '$amount', { $multiply: ['$amount', -1] }]
              }
            }
          }
        }
      ]);
      bankBalance = bankTxResult[0]?.net ?? 0;
    }

    if (isShowroomFiltered && apAccount) {
      const apTxResult = await LedgerTransaction.aggregate([
        { $match: { account: apAccount._id, showroom: showroomObjId } },
        {
          $group: {
            _id: null,
            net: {
              $sum: {
                $cond: [{ $eq: ['$type', 'credit'] }, '$amount', { $multiply: ['$amount', -1] }]
              }
            }
          }
        }
      ]);
      supplierPayable = apTxResult[0]?.net ?? 0;
    }

    const accountReceivable = totalWholesalerDue + totalBillDue;
    const maturedReceivable = Math.min(maturedReceivableRaw + maturedBillDueRaw, accountReceivable);
    const maturedPayable = null; // Set to null as supplier due-date data is unavailable

    // Fetch employee dashboard stats
    const EmployeeProfile = (await import('@/models/EmployeeProfile')).default;
    const Task = (await import('@/models/Task')).default;
    const Attendance = (await import('@/models/Attendance')).default;
    const SalaryDisbursement = (await import('@/models/SalaryDisbursement')).default;

    const prevMonthDate = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonthIdx = prevMonthDate.getMonth();
    const prevMonthStart = new Date(Date.UTC(prevYear, prevMonthIdx, 1, 0, 0, 0, 0));
    const prevMonthEnd = new Date(Date.UTC(prevYear, prevMonthIdx + 1, 0, 23, 59, 59, 999));
    const totalDaysInPrevMonth = new Date(prevYear, prevMonthIdx + 1, 0).getDate();
    const prevMonthStartStr = prevMonthStart.toLocaleDateString('sv').split('T')[0];
    const prevMonthEndStr = prevMonthEnd.toLocaleDateString('sv').split('T')[0];
    const prevMonthPeriod = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const employeeProfiles = await EmployeeProfile.find().lean() as any[];
    const tasksList = await Task.find().lean() as any[];

    // Calculate permanent/monthly employee salary payable
    const monthlyProfiles = employeeProfiles.filter(p => p.employeeType === 'monthly' && p.status !== 'discontinued');
    const monthlyUserIds = monthlyProfiles.map(p => p.user?.toString()).filter(Boolean);

    // Filter Attendance and SalaryDisbursement queries by date and relevant employee identifiers
    const attendanceList = await Attendance.find({
      employee: { $in: monthlyUserIds },
      date: { $gte: prevMonthStartStr, $lte: prevMonthEndStr }
    }).lean() as any[];

    const disbursementsList = await SalaryDisbursement.find({
      employee: { $in: monthlyUserIds },
      type: 'monthly_salary',
      $or: [
        { period: prevMonthPeriod },
        { date: { $gte: prevMonthStart, $lte: prevMonthEnd } }
      ]
    }).lean() as any[];

    // Build Map indexes keyed by employee identifier
    const attendanceMap = new Map<string, any[]>();
    for (const att of attendanceList) {
      const empId = att.employee?._id?.toString() || att.employee?.toString();
      if (empId) {
        if (!attendanceMap.has(empId)) {
          attendanceMap.set(empId, []);
        }
        attendanceMap.get(empId)!.push(att);
      }
    }

    const disbursementsMap = new Map<string, any[]>();
    for (const dis of disbursementsList) {
      const disEmpId = dis.employee?._id?.toString() || dis.employee?.toString();
      if (disEmpId) {
        if (!disbursementsMap.has(disEmpId)) {
          disbursementsMap.set(disEmpId, []);
        }
        disbursementsMap.get(disEmpId)!.push(dis);
      }
    }

    let permanentSalaryPayable = 0;

    for (const emp of monthlyProfiles) {
      const joinedDate = emp.joinedDate ? new Date(emp.joinedDate) : new Date(0);
      if (joinedDate <= prevMonthEnd) {
        let activeStartDate = new Date(prevMonthStart);
        if (joinedDate > prevMonthStart) {
          activeStartDate = new Date(joinedDate);
        }
        const activeDays = Math.ceil((prevMonthEnd.getTime() - activeStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        let proratedBaseSalary = emp.baseSalary || 0;
        if (joinedDate > prevMonthStart) {
          proratedBaseSalary = Math.round(((emp.baseSalary || 0) / totalDaysInPrevMonth) * activeDays);
        }
        
        let activeExpectedWorkingDays = 0;
        const weekendDaysList = emp.weekendDays || ['Friday'];
        const tempDate = new Date(activeStartDate);
        while (tempDate <= prevMonthEnd) {
          const dayName = tempDate.toLocaleDateString('en-US', { weekday: 'long' });
          if (!weekendDaysList.includes(dayName)) {
            activeExpectedWorkingDays++;
          }
          tempDate.setDate(tempDate.getDate() + 1);
        }
        
        const empUserStr = emp.user?.toString();
        const empAttendance = empUserStr ? (attendanceMap.get(empUserStr) || []) : [];
        const activePeriodLogs = empAttendance.filter((att: any) => {
          const attDate = new Date(att.date);
          return attDate >= activeStartDate && attDate <= prevMonthEnd;
        });
        
        const presentCount = activePeriodLogs.filter((l: any) => l.status === 'Present' || l.status === 'Late').length;
        const leaveCount = activePeriodLogs.filter((l: any) => l.status === 'Leave').length;
        const absentCount = activePeriodLogs.filter((l: any) => l.status === 'Absent').length;
        
        const totalAbsents = absentCount;
        
        const allowedAbsents = emp.allowedAbsents ?? 1;
        const absentDeductionRate = emp.absentDeductionRate || 0;
        const netAbsents = Math.max(0, totalAbsents - allowedAbsents);
        const deduction = netAbsents * absentDeductionRate;
        
        const empPaidInPrevMonth = empUserStr ? (disbursementsMap.get(empUserStr) || []).filter((dis: any) => {
          if (dis.type !== 'monthly_salary') return false;
          if (dis.period) {
            return dis.period === prevMonthPeriod;
          }
          const disDate = new Date(dis.date).toLocaleDateString('sv').split('T')[0];
          return disDate >= prevMonthStartStr && disDate <= prevMonthEndStr;
        }).reduce((sum: number, d: any) => sum + (d.amount || 0), 0) : 0;
        
        const payableSalary = Math.max(0, proratedBaseSalary - deduction - empPaidInPrevMonth);
        permanentSalaryPayable += payableSalary;
      }
    }

    // Calculate temporary/task-based employee wages payable (completed tasks not yet paid)
    const temporaryUserIds = employeeProfiles.filter(p => p.employeeType === 'task-based').map(p => p.user?.toString()).filter(Boolean);
    const completedTasks = tasksList.filter(t => t.status === 'Completed' && temporaryUserIds.includes(t.employee?.toString() || ''));
    const temporaryWagesPayable = completedTasks.reduce((sum, t) => sum + (t.payout || 0), 0);

    // Calculate running assigned tasks (count of pending tasks)
    const runningAssignedTasks = tasksList.filter(t => t.status === 'Pending').length;

    const wholesalerDuesMap: Record<string, any> = {};
    for (const order of creditOrders) {
      if (!order.user) continue;
      const uId = String(order.user._id);
      const outstanding = (order.totalAmount || 0) - (order.couponDiscountAmount || 0) - (order.walletAmountUsed || 0);
      if (wholesalerDuesMap[uId]) {
        wholesalerDuesMap[uId].due += outstanding;
      } else {
        wholesalerDuesMap[uId] = {
          name: order.user.name || 'Unknown Wholesaler',
          email: order.user.email,
          phone: order.user.phone,
          due: outstanding
        };
      }
    }
    const wholesalersDueList = Object.values(wholesalerDuesMap).sort((a: any, b: any) => b.due - a.due);

    return NextResponse.json({
      stats: {
        totalRevenue,
        salesCount,
        totalUsers,
        pendingOrdersCount,
        activeSubscribers,
        totalWalletTokens,
        totalCOGS,
        totalExpenses,
        grossProfit,
        netProfit,
        newUsersCount,
        returningUsersCount,
        totalWholesalerDue,
        cashBalance,
        bankBalance,
        accountReceivable,
        supplierPayable,
        maturedReceivable,
        maturedPayable,
        permanentSalaryPayable,
        temporaryWagesPayable,
        runningAssignedTasks,
        isShowroomFiltered: !!isShowroomFiltered
      },
      recentOrders,
      lowStockProducts,
      topSellingProducts,
      topCustomers,
      chartData,
      wholesalersDueList,
      showrooms: allShowrooms
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
