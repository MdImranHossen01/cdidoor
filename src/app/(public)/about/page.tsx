import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About Us | CDI Door Ind',
  description:
    'CDI Door Ind is a leading wooden door manufacturing industry in Bangladesh with multiple factories and showrooms, crafting premium quality doors from Teak, Mahogany, and other fine wood species.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: 'CDI Door Ind',
        contact: {
          email: 'info@cdidoorind.com',
          phone: '+8801234567890',
          address: 'Bangladesh',
        },
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for about page:', error);
    return null;
  }
}

export default async function AboutPage() {
  const settings = await getSettings();
  return <AboutClient settings={settings} />;
}
