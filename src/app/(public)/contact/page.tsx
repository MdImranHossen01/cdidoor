import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import ContactClient from './ContactClient';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  return {
    title: `Contact Us | ${storeName}`,
    description: `Get in touch with ${storeName} for any inquiries, support, or feedback.`,
  };
}

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    return {
      brandName: settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      contact: {
        email: settings?.contact?.email || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
        phone: settings?.contact?.phone || process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
        address: settings?.contact?.address || ""
      },
      socialLinks: settings?.socialLinks || {}
    };
  } catch (error) {
    console.error('Error fetching settings for contact page:', error);
    return {
      brandName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      contact: {
        email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
        phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
        address: ""
      },
      socialLinks: {}
    };
  }
}

export default async function ContactPage() {
  const settings = await getSettings();
  return <ContactClient settings={settings} />;
}
