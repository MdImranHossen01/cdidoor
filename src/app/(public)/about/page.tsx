import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import AboutClient from './AboutClient';

export async function generateMetadata(): Promise<Metadata> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || 'Store';
  return {
    title: `About Us | ${storeName}`,
    description: `Learn more about ${storeName}, our quality standards, customer dedication, and journey in the industry.`,
  };
}

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    return {
      brandName: settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || 'Store',
      contact: {
        email: settings?.contact?.email || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
        phone: settings?.contact?.phone || process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
        address: settings?.contact?.address || '',
      },
    };
  } catch (error) {
    console.error('Error fetching settings for about page:', error);
    return {
      brandName: process.env.NEXT_PUBLIC_STORE_NAME || 'Store',
      contact: {
        email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '',
        phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '',
        address: '',
      },
    };
  }
}

export default async function AboutPage() {
  const settings = await getSettings();
  return <AboutClient settings={settings} />;
}
