import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import TermsClient from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms & Conditions | CDI Door Ind',
  description: 'Understand the terms and conditions for shopping at CDI Door Ind.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: "CDI Door Ind",
        contact: {
          email: "support@cdidoorind.com",
          phone: "+8801234567890"
        }
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for terms page:', error);
    return {
      brandName: "CDI Door Ind",
      contact: {
        email: "support@cdidoorind.com",
        phone: "+8801234567890"
      }
    };
  }
}

export default async function TermsPage() {
  const settings = await getSettings();
  const lastUpdated = "April 04, 2026";
  
  return <TermsClient settings={settings} lastUpdated={lastUpdated} />;
}
