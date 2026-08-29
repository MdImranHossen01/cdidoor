import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'Privacy Policy | CDI Door Ind',
  description: 'Learn how CDI Door Ind collects, uses, and protects your personal information.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: "CDI Door Ind",
        contact: {
          email: "support@cdidoorind.com"
        }
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for privacy page:', error);
    return {
      brandName: "CDI Door Ind",
      contact: {
        email: "support@cdidoorind.com"
      }
    };
  }
}

export default async function PrivacyPage() {
  const settings = await getSettings();
  const lastUpdated = "April 04, 2026";

  return <PrivacyClient settings={settings} lastUpdated={lastUpdated} />;
}
