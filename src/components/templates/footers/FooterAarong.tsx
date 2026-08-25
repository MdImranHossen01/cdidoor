"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import * as SocialIcons from '@/components/ui/social-icons';
import {
  Circle,
  MapPin,
  Phone,
  Mail,
  Download,
  Send,
  ShieldCheck,
  RotateCcw,
  Truck
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

export default function FooterAarong() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const settings = useSettings();
  const socialLinks = settings?.socialLinks || {};
  const hasSocialLinks = Object.values(socialLinks).some(v => v);

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // PWA Install Event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setTimeout(() => {
        setIsStandalone(true);
      }, 0);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('App installed successfully');
    }
    setDeferredPrompt(null);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success('Subscribed successfully to our newsletter!');
        setEmail('');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Subscription failed');
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="w-full bg-card text-card-foreground border-t border-border/80">
      
      {/* ── Top Bar: Brand Value Props ── */}
      <div className="border-b border-border/60 py-8 bg-muted/20">
        <div className="container mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 p-4">
            <Truck className="h-8 w-8 text-primary" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{t('store.footer.secure_delivery')}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t('store.footer.secure_delivery_desc')}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-y md:border-y-0 md:border-x border-border/60">
            <RotateCcw className="h-8 w-8 text-primary" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{t('store.footer.easy_return')}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t('store.footer.easy_return_desc')}</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 p-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{t('store.footer.authentic_quality')}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t('store.footer.authentic_quality_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Middle Section: Navigation & Newsletter ── */}
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* Logo & Contact details */}
          <div className="space-y-6">
            <Logo />
            <div className="mt-1 mb-2">
               <LanguageToggle />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              {t('store.footer.description')}
            </p>
            <div className="space-y-3 pt-2 text-xs">
              {settings?.contact?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{settings.contact.address}</span>
                </div>
              )}
              {settings?.contact?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <a href={`tel:${settings.contact.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {settings.contact.phone}
                  </a>
                </div>
              )}
              {settings?.contact?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                  <a href={`mailto:${settings.contact.email}`} className="text-muted-foreground hover:text-primary transition-colors">
                    {settings.contact.email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{t('store.footer.quick_links')}</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.nav.about') || 'About Us'}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.nav.contact') || 'Contact Us'}</Link>
              </li>
              <li>
                <Link href="/track-order" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.nav.track_order') || 'Track Order'}</Link>
              </li>
              <li>
                <Link href="/shop" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.nav.shop') || 'Browse Shop'}</Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.nav.blogs') || 'Our Blog'}</Link>
              </li>
            </ul>
          </div>

          {/* Policies & App */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{t('store.footer.information')}</h4>
            <ul className="space-y-2.5 text-xs mb-6">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.footer.privacy')}</Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.footer.terms')}</Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-primary transition-all uppercase tracking-wider font-semibold">{t('store.footer.contact_support')}</Link>
              </li>
            </ul>

            {/* PWA App Install action */}
            {deferredPrompt && !isStandalone && (
              <div className="pt-2">
                <Button
                  onClick={handleInstallClick}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-none border-primary/50 text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  <Download className="mr-2 h-4 w-4 text-primary" /> Install Web App
                </Button>
              </div>
            )}
          </div>

          {/* Newsletter signup */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{t('store.footer.keep_in_touch') || 'Keep in touch'}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('store.footer.newsletter_desc') || 'Subscribe to stay updated with exclusive collections, seasonal sales, and brand stories.'}
            </p>
            <form onSubmit={handleNewsletterSubmit} className="relative flex items-center mt-4">
              <input
                type="email"
                placeholder={t('store.footer.email_placeholder') as string || 'Your email address'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-4 pr-12 text-xs bg-muted/30 border border-border/70 focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="absolute right-0 h-10 w-12 bg-primary text-primary-foreground hover:bg-primary/95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {/* Social channels */}
            {hasSocialLinks && (
              <div className="pt-4 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Follow Our Journey</span>
                <div className="flex flex-wrap gap-2.5">
                  {Object.entries(socialLinks).map(([platform, url]) => {
                    if (!url) return null;
                    const Icon = socialIconMap[platform];
                    if (!Icon) return null;

                    return (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 w-8 bg-muted hover:bg-primary hover:text-primary-foreground text-foreground/80 flex items-center justify-center transition-all border border-border/60"
                        title={socialLabels[platform] || platform}
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Bottom Section: Copyright & Developer credit ── */}
      <div className="border-t border-border/50 py-8 bg-muted/10">
        <div className="container mx-auto px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p className="text-center md:text-left">
            © {currentYear} {settings?.brandName || 'Omor Auto Corner'}. {t('store.footer.all_rights_reserved')}
          </p>
          <div className="flex items-center gap-2">
            <span className="opacity-80">Designed & Developed by</span>
            <DeveloperLogo className="opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" />
          </div>
        </div>
      </div>

    </footer>
  );
}
