/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as SocialIcons from '@/components/ui/social-icons';
import {
  Circle,
  MapPin,
  Phone,
  Mail,
  Download
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import DeveloperLogo from '@/components/ui/developerlogo';
import { useSettings } from '@/components/SettingsProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/layout/LanguageToggle';

const socialIconMap: Record<string, any> = {
  facebook: SocialIcons.Facebook || Circle,
  twitter: SocialIcons.Twitter || SocialIcons.X || Circle,
  instagram: SocialIcons.Instagram || Circle,
  youtube: SocialIcons.Youtube || Circle,
  linkedin: SocialIcons.Linkedin || Circle,
  tiktok: SocialIcons.Tiktok || Circle,
  whatsapp: SocialIcons.Whatsapp || Circle,
};

const socialLabels: Record<string, string> = {
  facebook: 'Facebook',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
};

export default function FooterV1() {
  const { t } = useLanguage();
  const settings = useSettings();
  const socialLinks = settings?.socialLinks || {};
  const hasSocialLinks = Object.values(socialLinks).some(v => v);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Detect iOS device
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success('App installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      toast.info('To install this app on your iPhone/iPad: Tap the "Share" icon in Safari and select "Add to Home Screen".', {
        duration: 8000,
      });
      return;
    }

    if (!deferredPrompt) {
      toast.info('To install the app: Click your browser menu (e.g. three dots icon in Chrome) and select "Install App" or "Add to Home Screen".', {
        duration: 6000,
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Thank you for installing our app!');
    }
    setDeferredPrompt(null);
  };

  const rawFooterNav = settings?.footerNavigation && settings.footerNavigation.length > 0
    ? settings.footerNavigation
    : [
      { label: t('store.footer.shop_all'), href: '/shop' },
      { label: t('store.footer.new_arrivals'), href: '/shop?filter=new' },
      { label: t('store.footer.order_tracking'), href: '/track-order' },
      { label: t('store.footer.contact_support'), href: '/contact' }
    ];
  const footerNav = rawFooterNav.filter((link: any) => link.label !== 'Contact Support' && link.label !== t('store.footer.contact_support'));

  return (
    <footer className="border-t bg-background pt-12 mt-10">
      <div className="container mx-auto px-4 md:px-0">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-center text-center md:items-start md:text-left gap-4 lg:col-span-2">
            <Logo textClassName="text-xl md:text-2xl whitespace-nowrap" />
            <div className="mt-1 mb-2">
              <LanguageToggle />
            </div>
            <p className="text-sm text-muted-foreground w-full md:w-4/5">
              {t('store.footer.description')}
            </p>

            {/* PWA Download App Button */}
            {!isStandalone && (
              <Button
                onClick={handleInstallClick}
                variant="outline"
                className="mt-2 rounded-full border-neutral-300 dark:border-neutral-700 text-foreground hover:bg-primary hover:text-primary-foreground font-black text-[10px] tracking-widest gap-2 h-9 px-4 uppercase transition-all duration-300"
              >
                <Download className="h-3.5 w-3.5 animate-bounce" />
                Download App
              </Button>
            )}
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left md:pt-3">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-foreground">{t('store.footer.quick_links')}</h2>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {footerNav.map((link: any) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-primary transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left md:pt-3">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-foreground">{t('store.footer.information')}</h2>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-primary transition-colors">{t('store.footer.contact_us')}</Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-primary transition-colors">{t('store.footer.terms')}</Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-primary transition-colors">{t('store.footer.privacy')}</Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center text-center md:items-start md:text-left md:pt-3">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-foreground">{t('store.footer.contact')}</h2>
            <ul className="grid gap-3 text-sm text-muted-foreground">
              <li className="flex items-start justify-center md:justify-start gap-3">
                <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                <span>{settings?.contact?.address || '123 Omor Auto Corner Avenue'}</span>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-3">
                <Phone size={16} className="text-primary shrink-0" />
                <span>{settings?.contact?.phone || '+880 1234-567890'}</span>
              </li>
              <li className="flex items-center justify-center md:justify-start gap-3">
                <Mail size={16} className="text-primary shrink-0" />
                <span>{settings?.contact?.email || 'support@omorautocorner.com'}</span>
              </li>
            </ul>
            {hasSocialLinks && (
              <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                {Object.entries(socialLinks).map(([platform, url]) => {
                  if (!url) return null;
                  const Icon = socialIconMap[platform];
                  if (!Icon) return null;

                  let safeUrl = "#";
                  if (url && url !== '#') {
                    try {
                      const parsedUrl = new URL(url as string);
                      if (['http:', 'https:', 'mailto:'].includes(parsedUrl.protocol)) {
                        safeUrl = url as string;
                      }
                    } catch (e) {
                      if (typeof url === 'string' && url.startsWith('/')) {
                        safeUrl = url;
                      }
                    }
                  }

                  return (
                    <a
                      key={platform}
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-all hover:scale-110"
                      aria-label={socialLabels[platform] || platform}
                    >
                      <Icon size={20} strokeWidth={2} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between border-t py-6 sm:flex-row text-sm text-muted-foreground gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <p>© {new Date().getFullYear()} {settings?.brandName || 'Omor Auto Corner'}. {t('store.footer.all_rights_reserved')}</p>
          </div>

          <div className="flex items-center gap-6">
            <DeveloperLogo />
          </div>
        </div>
      </div>
    </footer>
  );
}
