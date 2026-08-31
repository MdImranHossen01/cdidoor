'use client';

import { Separator } from '@/components/ui/separator';
import { ShieldCheck, Info, Share2, Lock, Eye, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyClient({ settings, lastUpdated }: { settings: any, lastUpdated: string }) {
  const { t } = useLanguage();
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || "Store";
  const contactEmail = settings?.contact?.email || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "";

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Header */}
      <section className="bg-primary/5 py-16 md:py-24 border-b">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {t('privacy.hero.title_start') as string || 'Privacy'} <span className="text-primary">{t('privacy.hero.title_end') as string || 'Policy'}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('privacy.hero.desc') as string || 'Your privacy is important to us. This policy explains how we handle your data and ensure your security while shopping with us.'}
          </p>
          <p className="mt-8 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            {t('privacy.hero.updated') as string || 'Last Updated:'} {lastUpdated}
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">

            {/* Introduction */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Info className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold m-0 italic">{t('privacy.sections.intro.title') as string || 'Introduction'}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.intro.desc_start') as string || 'Welcome to'} {brandName}. {t('privacy.sections.intro.desc_end') as string || 'We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.'}
              </p>
            </div>

            <Separator className="my-8" />

            {/* Information We Collect */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Eye className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold m-0 italic">{t('privacy.sections.collect.title') as string || 'Information We Collect'}</h2>
              </div>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {t('privacy.sections.collect.desc') as string || 'We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:'}
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-muted-foreground list-none p-0">
                <li className="flex gap-3 bg-muted/30 p-4 rounded-xl border">
                  <span className="font-bold text-primary">{t('privacy.sections.collect.identity.label') as string || 'Identity:'}</span> {t('privacy.sections.collect.identity.desc') as string || 'Includes first name, last name, and username.'}
                </li>
                <li className="flex gap-3 bg-muted/30 p-4 rounded-xl border">
                  <span className="font-bold text-primary">{t('privacy.sections.collect.contact.label') as string || 'Contact:'}</span> {t('privacy.sections.collect.contact.desc') as string || 'Includes email address, phone number, and delivery address.'}
                </li>
                <li className="flex gap-3 bg-muted/30 p-4 rounded-xl border">
                  <span className="font-bold text-primary">{t('privacy.sections.collect.financial.label') as string || 'Financial:'}</span> {t('privacy.sections.collect.financial.desc') as string || 'Includes payment card details (processed securely).'}
                </li>
                <li className="flex gap-3 bg-muted/30 p-4 rounded-xl border">
                  <span className="font-bold text-primary">{t('privacy.sections.collect.technical.label') as string || 'Technical:'}</span> {t('privacy.sections.collect.technical.desc') as string || 'Includes IP address, browser type, and login data.'}
                </li>
              </ul>
            </div>

            <Separator className="my-8" />

            {/* How We Use Your Data */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Bell className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold m-0 italic">{t('privacy.sections.use.title') as string || 'How We Use Your Data'}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.use.desc') as string || 'We will only use your personal data for the following purposes:'}
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-4">
                <li>{t('privacy.sections.use.li1') as string || 'To register you as a new customer and process your orders.'}</li>
                <li>{t('privacy.sections.use.li2') as string || 'To deliver and manage payments, fees, and charges.'}</li>
                <li>{t('privacy.sections.use.li3') as string || 'To manage our relationship with you, including notifications about policy changes.'}</li>
                <li>{t('privacy.sections.use.li4') as string || 'To enable you to partake in competitions or complete surveys.'}</li>
                <li>{t('privacy.sections.use.li5') as string || 'To improve our website, products, services, and customer experiences.'}</li>
              </ul>
            </div>

            <Separator className="my-8" />

            {/* Data Sharing */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Share2 className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold m-0 italic">{t('privacy.sections.sharing.title') as string || 'Sharing Your Information'}</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('privacy.sections.sharing.desc') as string || 'We do not sell your personal data to third parties. We only share your data with trusted partners (like delivery services and payment processors) who are essential for fulfilling your orders and providing our services. All third-party service providers are required to take appropriate security measures to protect your personal data.'}
              </p>
            </div>

            <Separator className="my-8" />

            {/* Security */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Lock className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold m-0 italic">{t('privacy.sections.security.title') as string || 'Security of Data'}</h2>
              </div>
              <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                <p className="text-muted-foreground italic leading-relaxed m-0">
                  {t('privacy.sections.security.desc') as string || 'We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees and partners who have a business need to know.'}
                </p>
              </div>
            </div>

            <Separator className="my-8" />

            {/* Contact Information */}
            <div className="bg-muted p-8 rounded-3xl text-center shadow-inner">
              <h2 className="text-2xl font-bold mb-4 italic">{t('privacy.contact.title') as string || 'Questions or Concerns?'}</h2>
              <p className="text-muted-foreground mb-6">
                {t('privacy.contact.desc') as string || 'If you have any questions about this privacy policy or our privacy practices, please contact us.'}
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="text-primary font-bold text-lg hover:underline transition-all"
              >
                {contactEmail}
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Footer Disclaimer */}
      <section className="bg-muted/50 py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground max-w-xl mx-auto">
            {t('privacy.footer.desc_start') as string || 'This privacy policy is a living document. We reserve the right to update it as our services and legal requirements evolve. Your continued use of'} {brandName} {t('privacy.footer.desc_end') as string || 'constitutes acceptance of these terms.'}
          </p>
        </div>
      </section>
    </div>
  );
}
