import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import Expense from '@/models/Expense';
import Showroom from '@/models/Showroom';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;

    if (!session || userRole !== 'showroom_manager') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const filterByDate = searchParams.get('filterByDate') !== 'false';

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (filterByDate) {
      // Default range: Last 30 days
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 30);
      const defaultTo = new Date();

      startDate = defaultFrom;
      if (from) {
        const parsedFrom = new Date(from);
        if (!isNaN(parsedFrom.getTime())) {
          startDate = parsedFrom;
        }
      }

      endDate = defaultTo;
      if (to) {
        const parsedTo = new Date(to);
        if (!isNaN(parsedTo.getTime())) {
          endDate = parsedTo;
        }
      }
      endDate.setHours(23, 59, 59, 999);
    }

    await connectToDatabase();

    // Find the showroom managed by this user
    const showroom = await Showroom.findOne({ manager: userId }).lean() as any;
    if (!showroom) {
      return NextResponse.json({ message: 'No showroom assigned to this manager' }, { status: 404 });
    }
    const showroomId = showroom._id;

    // Today's orders for this showroom
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayOrders = await Order.find({
      showroom: showroomId,
      createdAt: { $gte: startOfToday },
      deletedAt: null,
    }).lean();

    const todaySales = todayOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const todayOrderCount = todayOrders.length;

    // Date range orders for this showroom
    const orderDateQuery = startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};
    const rangeOrders = await Order.find({
      showroom: showroomId,
      ...orderDateQuery,
      deletedAt: null,
      status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] }
    }).lean() as any[];

    const totalRevenue = rangeOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    const salesCount = rangeOrders.length;

    // Unique customers for this showroom
    const showroomCustomers = await Order.distinct('user', { showroom: showroomId, user: { $ne: null }, deletedAt: null });
    const totalUsers = showroomCustomers.length;

    // Pending orders assigned to this showroom
    const pendingOrdersCount = await Order.countDocuments({
      showroom: showroomId,
      status: 'Order Placed',
      deletedAt: null
    });

    // Date range expenses
    const expenseDateQuery = startDate && endDate ? { date: { $gte: startDate, $lte: endDate } } : {};
    const rangeExpenses = await Expense.find({
      showroom: showroomId,
      status: 'Approved',
      ...expenseDateQuery
    }).lean() as any[];

    const totalExpenses = rangeExpenses
      .filter(e => e.type !== 'income')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const totalIncomes = rangeExpenses
      .filter(e => e.type === 'income')
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // Showroom stock (products with stock for this showroom)
    const products = await Product.find({
      'showroomStocks.showroom': showroomId,
      isPublished: true,
    }).select('name images showroomStocks').lean() as any[];

    const stockItems = products.map((p: any) => {
      const stockEntry = p.showroomStocks?.find((s: any) => s.showroom?.toString() === showroomId.toString());
      return {
        name: p.name,
        image: p.images?.[0] || null,
        stock: stockEntry?.stock ?? 0,
      };
    }).sort((a: any, b: any) => a.stock - b.stock); // low stock first

    // Recent orders
    const recentOrders = await Order.find({ showroom: showroomId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderId totalAmount status createdAt customerName')
      .lean();

    // ----------------------------------------------------
    // Treasury Calculations (Server-side aggregations to prevent unbounded loads)
    // ----------------------------------------------------
    const orderSums = await Order.aggregate([
      {
        $match: {
          showroom: showroomId,
          deletedAt: null
        }
      },
      {
        $facet: {
          cashReceived: [
            {
              $match: {
                paymentMethod: { $nin: ['Online', 'Credit'] },
                status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] }
              }
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ],
          bankReceived: [
            {
              $match: {
                paymentMethod: 'Online',
                status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] }
              }
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
          ],
          creditOrders: [
            {
              $match: {
                paymentMethod: 'Credit',
                paymentStatus: { $ne: 'Paid' },
                status: { $nin: ['Cancelled', 'Order Placed'] }
              }
            },
            {
              $group: {
                _id: null,
                totalReceivable: {
                  $sum: {
                    $subtract: [
                      { $ifNull: ['$totalAmount', 0] },
                      { $add: [{ $ifNull: ['$couponDiscountAmount', 0] }, { $ifNull: ['$walletAmountUsed', 0] }] }
                    ]
                  }
                },
                maturedReceivable: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ifNull: ['$expectedPaymentDate', false] },
                          { $lt: ['$expectedPaymentDate', new Date()] }
                        ]
                      },
                      {
                        $subtract: [
                          { $ifNull: ['$totalAmount', 0] },
                          { $add: [{ $ifNull: ['$couponDiscountAmount', 0] }, { $ifNull: ['$walletAmountUsed', 0] }] }
                        ]
                      },
                      0
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    const expenseSums = await Expense.aggregate([
      {
        $match: {
          showroom: showroomId,
          status: 'Approved'
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    const Bill = (await import('@/models/Bill')).default;
    const dueBills = await Bill.find({ showroom: showroomId, documentType: 'bill', status: 'Due' }).lean() as any[];
    const totalBillDue = dueBills.reduce((sum: number, b: any) => sum + (b.currentBillDue || 0), 0);
    const todayDate = new Date();
    const maturedBillDueRaw = dueBills.reduce((sum: number, b: any) => {
      if (b.expectedReceivableDate && new Date(b.expectedReceivableDate) < todayDate) {
        return sum + (b.currentBillDue || 0);
      }
      return sum;
    }, 0);

    const cashReceivedFromOrders = orderSums[0]?.cashReceived[0]?.total || 0;
    const bankReceivedFromOrders = orderSums[0]?.bankReceived[0]?.total || 0;
    const accountReceivable = (orderSums[0]?.creditOrders[0]?.totalReceivable || 0) + totalBillDue;
    const maturedReceivable = (orderSums[0]?.creditOrders[0]?.maturedReceivable || 0) + maturedBillDueRaw;

    const expenseMap = new Map(expenseSums.map((e: any) => [e._id, e.total]));
    const cashPaidForExpenses = expenseMap.get('expense') || 0;
    const cashReceivedFromIncomes = expenseMap.get('income') || 0;

    // Both expenses and incomes affect the CASH balance (consistent with the Ledger account)
    const cashBalance = cashReceivedFromOrders + cashReceivedFromIncomes - cashPaidForExpenses;
    const bankBalance = bankReceivedFromOrders;

    const LedgerAccount = (await import('@/models/LedgerAccount')).default;
    const apAccount = await LedgerAccount.findOne({ code: 'AP' }).lean() as any;

    const supplierPayable = apAccount ? apAccount.currentBalance : 0;
    const maturedPayable = 0;

    // ----------------------------------------------------
    // Chart Data aggregation
    // ----------------------------------------------------
    const orderMatch: any = {
      showroom: showroomId,
      status: { $in: ['Paid', 'Confirmed', 'Ready for Delivery', 'Released for Delivery', 'Delivered'] },
      deletedAt: null
    };
    if (startDate && endDate) {
      orderMatch.createdAt = { $gte: startDate, $lte: endDate };
    }

    const ordersData = await Order.aggregate([
      {
        $match: orderMatch
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      }
    ]);

    const expenseMatch: any = {
      showroom: showroomId,
      status: 'Approved'
    };
    if (startDate && endDate) {
      expenseMatch.date = { $gte: startDate, $lte: endDate };
    }

    const expensesIncomesData = await Expense.aggregate([
      {
        $match: expenseMatch
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    const mergedData: Record<string, any> = {};

    if (startDate && endDate) {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      for (let i = 0; i <= days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        if (dateStr <= endDate.toISOString().split('T')[0]) {
          mergedData[dateStr] = {
            date: dateStr,
            revenue: 0,
            orders: 0,
            expense: 0,
            income: 0,
            showroomBreakdown: {} // Satisfy custom tooltip type structure if shared
          };
        }
      }
    }

    ordersData.forEach((item: any) => {
      const dateStr = item._id;
      if (!mergedData[dateStr]) {
        mergedData[dateStr] = {
          date: dateStr,
          revenue: 0,
          orders: 0,
          expense: 0,
          income: 0,
          showroomBreakdown: {}
        };
      }
      mergedData[dateStr].revenue = item.revenue || 0;
      mergedData[dateStr].orders = item.orders || 0;
    });

    expensesIncomesData.forEach((item: any) => {
      const dateStr = item._id.date;
      if (!mergedData[dateStr]) {
        mergedData[dateStr] = {
          date: dateStr,
          revenue: 0,
          orders: 0,
          expense: 0,
          income: 0,
          showroomBreakdown: {}
        };
      }
      if (item._id.type === 'income') {
        mergedData[dateStr].income = item.amount || 0;
      } else {
        mergedData[dateStr].expense = item.amount || 0;
      }
    });

    const chartData = Object.values(mergedData).sort((a: any, b: any) => a.date.localeCompare(b.date));

    return NextResponse.json({
      showroom: { name: showroom.name, address: showroom.address },
      today: { sales: todaySales, orders: todayOrderCount },
      stats: {
        totalRevenue,
        salesCount,
        totalUsers,
        pendingOrdersCount,
        totalExpenses,
        totalIncomes,
        cashBalance,
        bankBalance,
        accountReceivable,
        supplierPayable,
        maturedReceivable,
        maturedPayable
      },
      stockItems,
      recentOrders,
      chartData
    });
  } catch (error: any) {
    console.error('Showroom Dashboard Stats Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
