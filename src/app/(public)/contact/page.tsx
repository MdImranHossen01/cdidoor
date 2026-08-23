import { Metadata } from 'next';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us | CDI Door Ind',
  description: 'Get in touch with CDI Door Ind for any inquiries, support, or feedback.',
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
          phone: "+8801234567890",
          address: "Dhaka, Bangladesh"
        },
        socialLinks: {}
      };
    }
    return JSON.parse(JSON.stringify(settings));
  } catch (error) {
    console.error('Error fetching settings for contact page:', error);
    return null;
  }
}

export default async function ContactPage() {
  const settings = await getSettings();
  return <ContactClient settings={settings} />;
}
