/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import Expense from '@/models/Expense';
import Showroom from '@/models/Showroom';
import Leave from '@/models/Leave';
import SupplierBill from '@/models/SupplierBill';
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

    // Run ALL independent heavy queries concurrently with Promise.all
    const [
      allShowrooms,
      revenueStats,
      expenseStats,
      incomeStats,
      generalUsersCount,
      wholesalersCount,
      pendingOrdersCount,
      pendingLeavesCount,
      recentOrders,
      lowStockProducts,
      activeSubscribers,
      totalWalletBalanceResult,
      topSellingProducts,
      topCustomers,
      allUsersWithOrders,
      showrooms,
      ordersData,
      expensesIncomesData,
      creditOrders,
      dueBills,
      ledgerAccounts,
      loanProviders,
      dueSupplierBills,
      activeBusinessLoans,
      tasksList,
      pendingExpensesList,
      totalSuppliersCount,
      stockValueResult,
      expiringProductsCount,
      expiredProductsCount,
      sevenDaysOrders,
      sevenDaysExpenses,
      sevenDaysSupplierBills
    ] = await Promise.all([
      // 0. All Showrooms
      Showroom.find({}).select('_id name').lean(),

      // 1. Revenue stats
      Order.aggregate([
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
      ]),

      // 2. Expense stats
      Expense.aggregate([
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
      ]),

      // 3. Income stats
      Expense.aggregate([
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
      ]),

      // 4. Users count
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'wholesaler' }),

      // 5. Pending Orders
      Order.countDocuments({ status: 'Order Placed', deletedAt: null, ...orderShowroomFilter }),

      // 6. Pending Leaves
      Leave.countDocuments({ status: 'Pending' }),

      // 7. Recent Orders
      Order.find({ deletedAt: null, ...orderShowroomFilter })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('shortId slug totalAmount status createdAt user')
        .populate('user', 'name email')
        .lean(),

      // 8. Low stock
      Product.find({ stock: { $lt: 5 }, deletedAt: null })
        .limit(5)
        .select('name stock price')
        .lean(),

      // 9. Loyalty
      User.countDocuments({ isSubscriptionActive: true }),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$walletBalance' } } }]),

      // 10. Top Selling Products
      Order.aggregate([
        {
          $match: {
            status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
            createdAt: { $gte: startDate, $lte: endDate },
            deletedAt: null,
            ...orderShowroomFilter
          }
        },
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
      ]),

      // 11. Top Customers
      Order.aggregate([
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
      ]),

      // 12. New vs Returning users
      Order.aggregate([
        {
          $match: {
            deletedAt: null,
            createdAt: { $gte: startDate, $lte: endDate },
            ...orderShowroomFilter
          }
        },
        { $group: { _id: '$user', count: { $sum: 1 } } }
      ]),

      // 13. Showrooms list for chart mapping
      Showroom.find({}).select('_id name').lean(),

      // 14. Chart Orders data
      Order.aggregate([
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
      ]),

      // 15. Chart Expenses / Incomes data
      Expense.aggregate([
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
      ]),

      // 16. Credit Orders
      Order.find({
        paymentMethod: 'Credit',
        paymentStatus: { $ne: 'Paid' },
        status: { $nin: ['Cancelled', 'Order Placed'] },
        deletedAt: null,
        ...orderShowroomFilter
      }).populate('user', 'name email phone').lean(),

      // 17. Due Bills
      (async () => {
        const Bill = (await import('@/models/Bill')).default;
        const billQuery: any = { documentType: 'bill', status: 'Due' };
        if (isShowroomFiltered) billQuery.showroom = showroomObjId;
        return Bill.find(billQuery).select('currentBillDue expectedReceivableDate').lean();
      })(),

      // 18. Ledger Accounts
      (async () => {
        const LedgerAccount = (await import('@/models/LedgerAccount')).default;
        return LedgerAccount.find().lean();
      })(),

      // 19. Loan Providers
      (async () => {
        const LoanProvider = (await import('@/models/LoanProvider')).default;
        return LoanProvider.find({}).sort({ name: 1 }).lean();
      })(),

      // 20. Due Supplier Bills
      SupplierBill.find({ status: 'Due', ...(isShowroomFiltered ? { showroom: showroomObjId } : {}) })
        .select('dueAmount expectedPaymentDate')
        .lean(),

      // 21. Active Business Loans
      (async () => {
        const BusinessLoan = (await import('@/models/BusinessLoan')).default;
        return BusinessLoan.find({ status: 'Active' }).lean();
      })(),

      // 22. Tasks
      (async () => {
        const Task = (await import('@/models/Task')).default;
        return Task.find({ status: 'Pending' }).select('_id status').lean();
      })(),

      // 23. Pending Expenses
      Expense.find({ type: 'expense', status: 'Pending', ...(isShowroomFiltered ? { showroom: showroomObjId } : {}) })
        .select('amount')
        .lean(),

      // 24. Total Suppliers
      (async () => {
        const Supplier = (await import('@/models/Supplier')).default;
        return Supplier.countDocuments();
      })(),

      // 25. Stock Purchase Value via MongoDB aggregation pipeline (Super Fast, No memory hogging)
      Product.aggregate([
        { $match: { deletedAt: null } },
        {
          $project: {
            productVal: {
              $cond: [
                { $gt: [{ $size: { $ifNull: ['$variants', []] } }, 0] },
                {
                  $sum: {
                    $map: {
                      input: '$variants',
                      as: 'v',
                      in: {
                        $multiply: [
                          { $ifNull: ['$$v.stock', 0] },
                          { $ifNull: ['$$v.purchasePrice', { $ifNull: ['$purchasePrice', 0] }] }
                        ]
                      }
                    }
                  }
                },
                {
                  $multiply: [
                    { $ifNull: ['$stock', 0] },
                    { $ifNull: ['$purchasePrice', 0] }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalStockValue: { $sum: '$productVal' }
          }
        }
      ]),

      // 26. Expiring Products
      (() => {
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        return Product.countDocuments({
          $or: [
            { batches: { $elemMatch: { expiryDate: { $gte: new Date(), $lte: thirtyDays } } } },
            { 'variants.batches': { $elemMatch: { expiryDate: { $gte: new Date(), $lte: thirtyDays } } } }
          ]
        });
      })(),

      // 27. Expired Products
      Product.countDocuments({
        $or: [
          { batches: { $elemMatch: { expiryDate: { $lt: new Date() } } } },
          { 'variants.batches': { $elemMatch: { expiryDate: { $lt: new Date() } } } }
        ]
      }),

      // 28. Last 7 Days Orders
      Order.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        deletedAt: null,
        status: { $nin: ['Cancelled'] }
      }).select('totalAmount paidAmount paymentMethod createdAt').lean(),

      // 29. Last 7 Days Expenses
      Expense.find({
        date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'Approved'
      }).select('amount type status date').lean(),

      // 30. Last 7 Days Supplier Bills
      SupplierBill.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).select('totalAmount paidAmount createdAt').lean()
    ]);

    // Financial summaries
    const {
      totalRevenue = 0,
      totalDeliveryCharge = 0,
      salesCount = 0,
      totalCOGS = 0
    } = revenueStats[0] || {};

    const totalExpenses = expenseStats[0]?.totalExpenses || 0;
    const totalIncomes = incomeStats[0]?.totalIncomes || 0;
    const grossProfit = totalRevenue - totalCOGS - totalDeliveryCharge;
    const netProfit = grossProfit + totalIncomes - totalExpenses;
    const totalUsers = generalUsersCount + wholesalersCount;
    const totalWalletTokens = totalWalletBalanceResult[0]?.total || 0;

    const returningUsersCount = allUsersWithOrders.filter((u: any) => u.count > 1).length;
    const newUsersCount = allUsersWithOrders.filter((u: any) => u.count === 1).length;

    // Showroom mapping
    const showroomMap: Record<string, string> = {};
    showrooms.forEach((s: any) => {
      showroomMap[s._id.toString()] = s.name;
    });

    // Chart Data build
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

    // Wholesaler dues & Receivables
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

    const totalBillDue = dueBills.reduce((sum: number, b: any) => sum + (b.currentBillDue || 0), 0);
    const maturedBillDueRaw = dueBills.reduce((sum: number, b: any) => {
      if (b.expectedReceivableDate && new Date(b.expectedReceivableDate) < todayDate) {
        return sum + (b.currentBillDue || 0);
      }
      return sum;
    }, 0);

    const cashAccount = ledgerAccounts.find((a: any) => a.code === 'CASH');
    const apAccount = ledgerAccounts.find((a: any) => a.code === 'AP');
    const bankAccounts = ledgerAccounts.filter((a: any) => a.accountCategory === 'Bank' && a.code !== 'BANK');
    const mfsAccounts = ledgerAccounts.filter((a: any) => a.accountCategory === 'MFS');

    let cashBalance = cashAccount ? cashAccount.currentBalance : 0;
    let supplierPayable = apAccount ? apAccount.currentBalance : 0;

    const bankBalancesList = bankAccounts.map((a: any) => ({ id: String(a._id), name: a.name, balance: a.currentBalance }));
    const mfsBalancesList = mfsAccounts.map((a: any) => ({ id: String(a._id), name: a.name, balance: a.currentBalance }));

    // Showroom-specific ledger filtering if required
    if (isShowroomFiltered) {
      const LedgerTransaction = (await import('@/models/LedgerTransaction')).default;
      const accountIdsToFetch = [];
      if (cashAccount) accountIdsToFetch.push(cashAccount._id);
      if (apAccount) accountIdsToFetch.push(apAccount._id);
      bankAccounts.forEach((a: any) => accountIdsToFetch.push(a._id));
      mfsAccounts.forEach((a: any) => accountIdsToFetch.push(a._id));

      const txResults = await LedgerTransaction.aggregate([
        { $match: { account: { $in: accountIdsToFetch }, showroom: showroomObjId } },
        {
          $group: {
            _id: '$account',
            debitSum: { $sum: { $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0] } },
            creditSum: { $sum: { $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0] } }
          }
        }
      ]);

      const txMap = new Map();
      txResults.forEach((res: any) => {
        txMap.set(String(res._id), res);
      });

      if (cashAccount) {
        const cashRes = txMap.get(String(cashAccount._id));
        cashBalance = cashRes ? cashRes.debitSum - cashRes.creditSum : 0;
      }
      if (apAccount) {
        const apRes = txMap.get(String(apAccount._id));
        supplierPayable = apRes ? apRes.creditSum - apRes.debitSum : 0;
      }

      bankBalancesList.forEach((b: any) => {
        const res = txMap.get(b.id);
        b.balance = res ? res.debitSum - res.creditSum : 0;
      });

      mfsBalancesList.forEach((m: any) => {
        const res = txMap.get(m.id);
        m.balance = res ? res.debitSum - res.creditSum : 0;
      });
    }

    const bankBalance = bankBalancesList.reduce((sum: number, b: any) => sum + b.balance, 0);
    const mfsBalanceTotal = mfsBalancesList.reduce((sum: number, m: any) => sum + m.balance, 0);

    const accountReceivable = totalWholesalerDue + totalBillDue;
    const maturedReceivable = Math.min(maturedReceivableRaw + maturedBillDueRaw, accountReceivable);

    supplierPayable = dueSupplierBills.reduce((sum: number, b: any) => sum + (b.dueAmount || 0), 0);
    const maturedSupplierPayableRaw = dueSupplierBills.reduce((sum: number, b: any) => {
      if (b.expectedPaymentDate && new Date(b.expectedPaymentDate) < todayDate) {
        return sum + (b.dueAmount || 0);
      }
      return sum;
    }, 0);

    const businessLoanPayable = activeBusinessLoans.reduce((sum: number, l: any) => sum + (l.dueAmount || 0), 0);
    const maturedBusinessLoanRaw = activeBusinessLoans.reduce((sum: number, l: any) => {
      let maturedAmount = 0;
      if (l.repaymentType === 'Installment') {
        if (l.installmentDayOfMonth && l.installmentAmount && l.date) {
          const loanStartDate = new Date(l.date);
          const currentYear = todayDate.getFullYear();
          const currentMonth = todayDate.getMonth();
          let diffMonths = (currentYear - loanStartDate.getFullYear()) * 12 + (currentMonth - loanStartDate.getMonth());
          if (todayDate.getDate() < l.installmentDayOfMonth) {
            diffMonths--;
          }
          const passedInstallments = Math.max(0, diffMonths);
          const expectedPaid = passedInstallments * l.installmentAmount;
          maturedAmount = Math.max(0, expectedPaid - (l.paidAmount || 0));
        }
      } else {
        if (l.expectedRepaymentDate && new Date(l.expectedRepaymentDate) < todayDate) {
          maturedAmount = l.dueAmount || 0;
        }
      }
      return sum + maturedAmount;
    }, 0);

    const maturedPayable = maturedSupplierPayableRaw + maturedBusinessLoanRaw;
    const runningAssignedTasks = tasksList.length;
    const pendingExpenseCount = pendingExpensesList.length;
    const pendingExpenseTotal = pendingExpensesList.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

    const totalStockPurchaseValue = stockValueResult[0]?.totalStockValue || 0;
    const customerAdvanceAccount = ledgerAccounts.find((a: any) => a.code === 'CUSTOMER_ADVANCE' || a.name?.toLowerCase().includes('advance'));
    const totalCustomerAdvance = customerAdvanceAccount ? Math.abs(customerAdvanceAccount.currentBalance || 0) : 0;

    // 7 Days Daily Breakdown
    const last7DaysStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dDay = d.getDate().toString().padStart(2, '0');
      const dMonth = d.toLocaleString('en-US', { month: 'short' });
      const dYear = d.getFullYear();
      const displayDate = `${dDay}-${dMonth}-${dYear}`;
      const dateKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${dDay}`;

      const dayOrders = sevenDaysOrders.filter((o: any) => {
        if (!o.createdAt) return false;
        const oDate = new Date(o.createdAt);
        return oDate.getFullYear() === d.getFullYear() && oDate.getMonth() === d.getMonth() && oDate.getDate() === d.getDate();
      });
      const dayExpenses = sevenDaysExpenses.filter((e: any) => {
        if (!e.date) return false;
        const eDate = new Date(e.date);
        return eDate.getFullYear() === d.getFullYear() && eDate.getMonth() === d.getMonth() && eDate.getDate() === d.getDate() && e.type === 'expense';
      });
      const daySupplierBills = sevenDaysSupplierBills.filter((s: any) => {
        if (!s.createdAt) return false;
        const sDate = new Date(s.createdAt);
        return sDate.getFullYear() === d.getFullYear() && sDate.getMonth() === d.getMonth() && sDate.getDate() === d.getDate();
      });

      const sale = dayOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
      const salePayment = dayOrders.reduce((sum: number, o: any) => sum + (o.paidAmount || (o.paymentMethod !== 'Credit' ? o.totalAmount : 0) || 0), 0);
      const purchase = daySupplierBills.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const purchasePayment = daySupplierBills.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0);
      const expense = dayExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
      const expensePayment = expense;
      const dueCollection = dayOrders.filter((o: any) => o.paymentMethod === 'Credit').reduce((sum: number, o: any) => sum + (o.paidAmount || 0), 0);
      const advanceCollection = 0;

      last7DaysStats.push({
        date: dateKey,
        displayDate,
        sale,
        salePayment,
        purchase,
        purchasePayment,
        expense,
        expensePayment,
        dueCollection,
        advanceCollection
      });
    }

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
        generalUsersCount,
        wholesalersCount,
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
        bankBalancesList,
        mfsBalanceTotal,
        mfsBalancesList,
        accountReceivable,
        supplierPayable,
        maturedSupplierPayable: maturedSupplierPayableRaw,
        businessLoanPayable,
        maturedBusinessLoan: maturedBusinessLoanRaw,
        maturedReceivable,
        maturedWholesalerDue: maturedReceivableRaw,
        maturedGeneralDue: maturedBillDueRaw,
        totalBillDue,
        maturedPayable,
        runningAssignedTasks,
        pendingExpenseCount,
        pendingExpenseTotal,
        totalSuppliersCount,
        expiringProductsCount,
        expiredProductsCount,
        pendingLeavesCount,
        totalStockPurchaseValue,
        totalCustomerAdvance,
        isShowroomFiltered: !!isShowroomFiltered,
        ledgerAccounts: ledgerAccounts || [],
        loanProviders: loanProviders || []
      },
      recentOrders,
      lowStockProducts,
      topSellingProducts,
      topCustomers,
      chartData,
      last7DaysStats,
      wholesalersDueList,
      showrooms: allShowrooms
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
