'use client';

import Link from 'next/link';
import {
  Factory,
  ShieldCheck,
  Sparkles,
  HeartHandshake,
  ArrowRight,
  Building2,
  Users,
  Layers,
  DoorOpen,
  Wrench,
  Eye,
  Target,
  TreePine,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutClient({ settings }: { settings: any }) {
  const { t } = useLanguage();
  const brandName = settings?.brandName || process.env.NEXT_PUBLIC_STORE_NAME || 'Store';

  const woodTypes = [
    {
      name: t('about.wood.teak.name') as string || 'Teak (Sagwan)',
      desc: t('about.wood.teak.desc') as string || 'Premium hardwood, naturally termite-resistant and weatherproof. The gold standard for main entrance doors.',
      grade: t('about.wood.teak.grade') as string || 'Luxury Grade',
    },
    {
      name: t('about.wood.mahogany.name') as string || 'Mahogany',
      desc: t('about.wood.mahogany.desc') as string || 'Rich reddish-brown grain with excellent workability. Perfect for interior and carved decorative doors.',
      grade: t('about.wood.mahogany.grade') as string || 'Premium Grade',
    },
    {
      name: t('about.wood.shegun.name') as string || 'Shegun (Burmese Teak)',
      desc: t('about.wood.shegun.desc') as string || 'Finest quality imported teak with tight grain and superior oil content. Used in our luxury door lines.',
      grade: t('about.wood.shegun.grade') as string || 'Ultra Luxury',
    },
    {
      name: t('about.wood.sal.name') as string || 'Sal Wood (Shorea)',
      desc: t('about.wood.sal.desc') as string || 'Dense and strong local hardwood. Great for heavy-duty, high-traffic commercial door applications.',
      grade: t('about.wood.sal.grade') as string || 'Commercial Grade',
    },
    {
      name: t('about.wood.meranti.name') as string || 'Meranti (Lal Champa)',
      desc: t('about.wood.meranti.desc') as string || 'Cost-effective hardwood widely used for interior flush doors and panel doors.',
      grade: t('about.wood.meranti.grade') as string || 'Standard Grade',
    },
    {
      name: t('about.wood.engineered.name') as string || 'Engineered Wood (HDF/MDF)',
      desc: t('about.wood.engineered.desc') as string || 'Moisture-resistant and warp-free engineered core. Used in flush, laminated, and veneer door construction.',
      grade: t('about.wood.engineered.grade') as string || 'Engineered Grade',
    },
  ];

  const doorTypes = [
    { name: t('about.door.solid.name') as string || 'Solid Wood Doors', desc: t('about.door.solid.desc') as string || '100% natural hardwood â€” strongest and most durable option for entrance doors.' },
    { name: t('about.door.flush.name') as string || 'Flush Doors', desc: t('about.door.flush.desc') as string || 'Smooth flat-surface doors with wood or HDF core. Ideal for all interior spaces.' },
    { name: t('about.door.panelled.name') as string || 'Panelled Doors', desc: t('about.door.panelled.desc') as string || 'Classic raised or recessed panel design available in all wood species.' },
    { name: t('about.door.carved.name') as string || 'Carved / Designer Doors', desc: t('about.door.carved.desc') as string || 'Handcrafted intricate wood carvings for premium entrance statements.' },
    { name: t('about.door.veneer.name') as string || 'Veneer Doors', desc: t('about.door.veneer.desc') as string || 'Natural wood veneer finish over engineered core â€” elegant look at lower cost.' },
    { name: t('about.door.laminated.name') as string || 'Laminated Doors', desc: t('about.door.laminated.desc') as string || 'HPL laminate on wood core â€” scratch-resistant and easy to maintain.' },
    { name: t('about.door.french.name') as string || 'French Doors', desc: t('about.door.french.desc') as string || 'Double-leaf wooden doors with glass inserts for living rooms and balconies.' },
    { name: t('about.door.sliding.name') as string || 'Sliding Barn Doors', desc: t('about.door.sliding.desc') as string || 'Rustic solid wood sliding doors for interior partitions and modern dÃ©cor.' },
    { name: t('about.door.louvred.name') as string || 'Louvred Doors', desc: t('about.door.louvred.desc') as string || 'Wooden slatted doors for ventilation â€” ideal for wardrobes and bathrooms.' },
    { name: t('about.door.custom.name') as string || 'Custom / OEM Doors', desc: t('about.door.custom.desc') as string || 'Fully bespoke wooden doors built to exact client specifications and sizes.' },
  ];

  const coreValues = [
    {
      icon: TreePine,
      title: t('about.values.sourcing.title') as string || 'Premium Wood Sourcing',
      desc: t('about.values.sourcing.desc') as string || 'We source only the highest-grade timber from certified suppliers â€” ensuring every door starts with the finest raw material.',
    },
    {
      icon: Wrench,
      title: t('about.values.craftsmanship.title') as string || 'Master Craftsmanship',
      desc: t('about.values.craftsmanship.desc') as string || 'Our skilled carpenters and CNC operators combine traditional joinery with modern machinery for flawless precision.',
    },
    {
      icon: ShieldCheck,
      title: t('about.values.quality.title') as string || 'Quality Assured',
      desc: t('about.values.quality.desc') as string || 'Every wooden door undergoes moisture testing, grain inspection, joint strength verification, and finish quality checks before dispatch.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-transparent py-20 md:py-32 border-b border-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-4">
            <TreePine className="h-3 w-3" /> {t('about.hero.badge') as string || 'Bangladesh\'s Premier Wooden Door Manufacturer'}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6">
            {t('about.hero.title_start') as string || 'About'} <span className="text-primary">{brandName}</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            {t('about.hero.desc_start') as string || 'Crafting premium wooden doors with the beauty of natural wood and the precision of modern manufacturing â€” '}{' '}
            <strong className="text-primary">{brandName}</strong> {t('about.hero.desc_end') as string || 'serves residential, commercial, and industrial clients across Bangladesh through multiple factories and showrooms.'}
          </p>
        </div>
      </section>

      {/* â”€â”€ Stats â”€â”€ */}
      <section className="py-12 bg-card/30 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '15+', label: t('about.stats.years') as string || 'Years of Craftsmanship' },
              { value: t('about.stats.multiple') as string || 'Multiple', label: t('about.stats.factories') as string || 'Manufacturing Factories' },
              { value: t('about.stats.nationwide') as string || 'Nationwide', label: t('about.stats.showrooms') as string || 'Showrooms Across BD' },
              { value: '100%', label: t('about.stats.wooden') as string || 'Wooden Doors Only' },
            ].map((s) => (
              <div key={s.label} className="p-4 space-y-1">
                <p className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Story & Mission â”€â”€ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {t('about.story.title1') as string || 'The Art of Wood.'} <br />
                <span className="text-primary">{t('about.story.title2') as string || 'The Science of Doors.'}</span>
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                <strong>{brandName}</strong> {t('about.story.p1') as string || 'has been crafting premium wooden doors for over 15 years. With multiple fully equipped manufacturing facilities and showrooms across Bangladesh, we combine cutting-edge CNC machinery with the skilled hands of master carpenters.'}
              </p>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                {t('about.story.p2') as string || 'We craft exclusively wooden doors â€” from solid teak entrance doors and ornate carved designer doors to smooth flush doors and moisture-resistant laminated doors. Every door is built using carefully selected wood species, processed with precision, and finished to perfection.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{t('about.mission.title') as string || 'Our Mission'}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('about.mission.desc') as string || 'To manufacture world-class wooden doors that blend natural beauty, durability, and security â€” accessible to every segment of the Bangladesh market.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">{t('about.vision.title') as string || 'Our Vision'}</h4>
                    <p className="text-xs text-muted-foreground">
                      {t('about.vision.desc') as string || 'To become South Asia\'s leading wooden door brand, known for unmatched craftsmanship and sustainable wood sourcing.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote panel */}
            <div className="relative aspect-square md:aspect-video lg:aspect-square max-w-md mx-auto w-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-primary-foreground/30 p-1 shadow-2xl">
              <div className="w-full h-full bg-slate-900 rounded-[22px] overflow-hidden relative flex flex-col justify-end p-8 text-white">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_10%,transparent_10.1%)] bg-[length:20px_20px]" />
                <div className="relative z-20 space-y-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md self-start inline-block">
                    {t('about.promise.badge') as string || 'Our Promise'}
                  </span>
                  <blockquote className="text-lg md:text-xl font-bold leading-relaxed italic">
                    &quot;{t('about.promise.quote') as string || 'Every door we craft is a testament to the timeless beauty and enduring strength of wood.'}&quot;
                  </blockquote>
                  <p className="text-xs text-slate-300 font-medium">â€” {t('about.promise.team') as string || 'The'} {brandName} {t('about.promise.team2') as string || 'Team'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Core Values â”€â”€ */}
      <section className="py-16 md:py-24 bg-primary/5 border-t border-b border-primary/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">{t('about.values.title') as string || `Why Choose ${brandName}?`}</h2>
            <p className="text-muted-foreground text-sm">
              {t('about.values.desc') as string || `Three pillars that make every ${brandName} wooden door a benchmark of quality and lasting value.`}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coreValues.map((v) => (
              <div
                key={v.title}
                className="bg-background p-8 rounded-2xl border shadow-sm space-y-4 text-center flex flex-col items-center hover:-translate-y-1 transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">{v.title}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[280px]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Wood Types â”€â”€ */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <TreePine className="h-3 w-3" /> {t('about.woods.badge') as string || 'Our Wood Selection'}
            </span>
            <h2 className="text-3xl font-bold tracking-tight">{t('about.woods.title') as string || 'Woods We Work With'}</h2>
            <p className="text-muted-foreground text-sm">
              {t('about.woods.desc') as string || 'We source and work with six distinct wood types â€” each selected for a specific purpose, price range, and aesthetic quality.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {woodTypes.map((w) => (
              <div
                key={w.name}
                className="relative rounded-2xl border bg-card p-6 space-y-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full" />
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <TreePine className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                    {w.grade}
                  </span>
                </div>
                <h3 className="font-bold text-base text-foreground">{w.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Door Types â”€â”€ */}
      <section className="py-16 md:py-20 bg-muted/30 border-t border-b">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              <Layers className="h-3 w-3" /> {t('about.doors.badge') as string || 'Product Range'}
            </span>
            <h2 className="text-3xl font-bold tracking-tight">{t('about.doors.title') as string || 'Types of Wooden Doors We Make'}</h2>
            <p className="text-muted-foreground text-sm">
              {t('about.doors.desc') as string || 'From classic solid wood to modern engineered panels â€” we manufacture 10 distinct styles of wooden doors for every room and purpose.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {doorTypes.map((d) => (
              <div
                key={d.name}
                className="bg-background rounded-2xl border p-5 space-y-2 hover:shadow-md hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <DoorOpen className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-sm text-foreground leading-tight">{d.name}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Factories & Showrooms (generic) â”€â”€ */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="rounded-2xl border bg-card p-8 space-y-4 text-center flex flex-col items-center hover:shadow-lg transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Factory className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold">{t('about.factories.title') as string || 'Multiple Factories'}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong>{brandName}</strong> {t('about.factories.desc') as string || 'operates multiple state-of-the-art wooden door manufacturing facilities equipped with modern CNC machinery and skilled craftsmen.'}
              </p>
              <Link href="/contact" passHref>
                <Button variant="outline" size="sm" className="rounded-full mt-2">
                  {t('about.factories.btn') as string || 'Contact for Factory Info'}
                </Button>
              </Link>
            </div>
            <div className="rounded-2xl border bg-card p-8 space-y-4 text-center flex flex-col items-center hover:shadow-lg transition-all duration-300">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold">{t('about.showrooms.title') as string || 'Nationwide Showrooms'}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {t('about.showrooms.desc') as string || 'Visit any of our showrooms across Bangladesh to see, touch, and experience our full range of premium wooden door products firsthand.'}
              </p>
              <Link href="/contact" passHref>
                <Button variant="outline" size="sm" className="rounded-full mt-2">
                  {t('about.showrooms.btn') as string || 'Find Nearest Showroom'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Numbers â”€â”€ */}
      <section className="py-12 bg-primary/5 border-t border-b border-primary/10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: Users, value: '1,200+', label: t('about.numbers.craftsmen') as string || 'Skilled Craftsmen' },
              { icon: Factory, value: '12,000+', label: t('about.numbers.produced') as string || 'Doors Produced Monthly' },
              { icon: Building2, value: '500+', label: t('about.numbers.clients') as string || 'Corporate Clients' },
              { icon: Star, value: '98%', label: t('about.numbers.satisfaction') as string || 'Client Satisfaction' },
            ].map((s) => (
              <div key={s.label} className="p-4 space-y-2 flex flex-col items-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl md:text-4xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ Technology Partner â”€â”€ */}
      <section className="py-16 bg-gradient-to-b from-card to-background border-y border-muted relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.15)_1px,transparent_1px)] bg-[length:16px_16px]" />
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
            <span>{t('about.tech.badge') as string || 'Technology Partner'}</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {t('about.tech.title') as string || 'Crafted by Jia Pixel'}
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {t('about.tech.desc_start') as string || 'This high-performance e-commerce and B2B platform is designed, built, and optimized by'}{' '}
            <a
              href="https://www.jiapixel.com"
              target="_blank"
              rel="noopener"
              className="text-primary font-semibold hover:underline transition-all"
            >
              Jia Pixel
            </a>
            , {t('about.tech.desc_mid') as string || 'the Leading Digital Agency In Bangladesh â€” engineering custom digital solutions for manufacturing industries like'} <strong>{brandName}</strong>.
          </p>
        </div>
      </section>

      {/* â”€â”€ CTA â”€â”€ */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 space-y-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            {t('about.cta.title_start') as string || 'Find Your'} <span className="text-primary">{t('about.cta.title_end') as string || 'Perfect Wooden Door'}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            {t('about.cta.desc') as string || 'Browse our full catalog or contact our team for bulk orders and custom wooden door manufacturing.'}
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link href="/shop" passHref>
              <Button
                size="lg"
                className="rounded-full px-8 py-6 font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {t('about.cta.browse') as string || 'Browse Our Doors'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact" passHref>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 py-6 font-bold text-sm transition-all hover:bg-muted/50"
              >
                {t('about.cta.contact') as string || 'Contact Us'}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
