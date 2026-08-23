import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Order from '@/models/Order';
import GlobalSettings from '@/models/GlobalSettings';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: 'Order ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const order = await Order.findById(id).populate('showroom', 'name address phone');
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    const rawSettings = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();
    let settings = null;
    if (rawSettings) {
      settings = {
        brandName: rawSettings.brandName,
        logoUrl: rawSettings.logoUrl,
        contact: rawSettings.contact,
        socialLinks: rawSettings.socialLinks,
        marqueeText: rawSettings.marqueeText,
        freeDeliveryThreshold: rawSettings.freeDeliveryThreshold,
        deliveryChargeInsideDhaka: rawSettings.deliveryChargeInsideDhaka,
        deliveryChargeOutsideDhaka: rawSettings.deliveryChargeOutsideDhaka,
        metaTitle: rawSettings.metaTitle,
        metaDescription: rawSettings.metaDescription,
        paymentConfig: rawSettings.paymentConfig ? {
          activeMethod: rawSettings.paymentConfig.activeMethod,
          sslcommerz: rawSettings.paymentConfig.sslcommerz ? {
            storeId: rawSettings.paymentConfig.sslcommerz.storeId,
            isSandbox: rawSettings.paymentConfig.sslcommerz.isSandbox
          } : undefined
        } : undefined,
        manualPaymentConfig: rawSettings.manualPaymentConfig,
        uiTemplates: rawSettings.uiTemplates,
        footerNavigation: rawSettings.footerNavigation,
        testimonials: rawSettings.testimonials,
      };
    }

    return NextResponse.json({ order, settings });
  } catch (error: any) {
    console.error('Error fetching public order:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
