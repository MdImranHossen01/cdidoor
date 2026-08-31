import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import TermsClient from './TermsClient';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  return {
    title: `Terms & Conditions | ${storeName}`,
    description: `Understand the terms and conditions for shopping at ${storeName}.`,
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
      }
    };
  } catch (error) {
    console.error('Error fetching settings for terms page:', error);
    return {
      brandName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      contact: {
        email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
        phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "",
        address: ""
      }
    };
  }
}

export default async function TermsPage() {
  const settings = await getSettings();
  const lastUpdated = "April 04, 2026";
  
  return <TermsClient settings={settings} lastUpdated={lastUpdated} />;
}
