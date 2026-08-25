import { Metadata } from 'next';
import Link from 'next/link';
import { Laptop, Cpu, ShieldCheck, Award, Sparkles, HeartHandshake, ArrowRight, Server } from 'lucide-react';
import connectToDatabase from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'About Us | Omor Auto Corner',
  description: 'Omor Auto Corner - Premium motorcycle parts and accessories store in Bangladesh. Explore our high-quality collection of DOT/ECE certified helmets, genuine engine oils, high-grip tyres, and modification parts.',
};

async function getSettings() {
  try {
    await connectToDatabase();
    const settings = await GlobalSettings.findOne().lean();
    if (!settings) {
      return {
        brandName: "Omor Auto Corner",
        contact: {
          email: "support@omorautocorner.com",
          phone: "+8801234567890",
          address: "Dhaka, Bangladesh"
        }
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
  const brandName = settings?.brandName || "Omor Auto Corner";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-transparent py-20 md:py-28 border-b border-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-4">
            <Sparkles className="h-3 w-3" /> Premium Motorcycle Parts & Accessories
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-6">
            About <span className="text-primary">Us</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            Driven by a passion for motorcycling, safety, and performance, <strong className="text-primary">{brandName}</strong> delivers top-tier parts and accessories designed to protect riders and elevate your riding experiences.
          </p>
        </div>
      </section>

      {/* Stats / Key features */}
      <section className="py-12 bg-card/30 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">100%</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Genuine Products</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">15k+</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Satisfied Tech Clients</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">3-Year</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Warranty Support Available</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-3xl md:text-4xl font-extrabold text-primary">24/7</p>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">Support Assistance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Story & Mission Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Connecting Riders with Premium Parts & Accessories
              </h2>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                At Omor Auto Corner, we believe that motorcycle maintenance and safety should be high-quality, accessible, and user-friendly. We curate the finest products—whether you require a DOT-certified helmet for daily commuting, genuine synthetic engine oil, high-grip racing tyres, or custom modification accessories.
              </p>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                All safety gear and motorcycle parts are sourced directly from authorized global manufacturers and tested thoroughly before being delivered to our riders.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Our Mission</h4>
                    <p className="text-xs text-muted-foreground">To provide premium safety gear and performance parts that safeguard riders and enhance motorcycling experiences with peak efficiency.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Our Vision</h4>
                    <p className="text-xs text-muted-foreground">To be Bangladesh's most trusted provider of advanced motorcycle parts and safety gear, celebrated for product authenticity and long-term rider support.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Decorative visual container */}
            <div className="relative aspect-square md:aspect-video lg:aspect-square max-w-md mx-auto w-full rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-primary-foreground/30 p-1 shadow-2xl">
              <div className="w-full h-full bg-slate-900 rounded-[22px] overflow-hidden relative flex flex-col justify-end p-8 text-white">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent z-10" />

                {/* Embedded dynamic design background */}
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_10%,transparent_10.1%)] bg-[length:20px_20px]" />

                <div className="relative z-20 space-y-3">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md self-start inline-block">
                    Our Slogan
                  </span>
                  <blockquote className="text-lg md:text-xl font-bold leading-relaxed italic">
                    "Secure your ride and elevate your motorcycling experience."
                  </blockquote>
                  <p className="text-xs text-slate-300 font-medium">
                    — The {brandName} Team
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-16 md:py-24 bg-primary/5 border-t border-b border-primary/10">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Why Choose Us?</h2>
            <p className="text-muted-foreground text-sm">
              Discover what makes our tech marketplace and custom computer systems highly reliable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl border shadow-sm space-y-4 text-center flex flex-col items-center hover:-translate-y-1 transition-all duration-300">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">100% Genuine Components</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-[280px]">
                We source parts exclusively from authorized global distribution channels, ensuring complete warranty protection.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border shadow-sm space-y-4 text-center flex flex-col items-center hover:-translate-y-1 transition-all duration-300">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Laptop className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Expert Recommendations</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-[280px]">
                Our experienced team can recommend the perfect accessories and parts tailored exactly to your motorcycle and riding style.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border shadow-sm space-y-4 text-center flex flex-col items-center hover:-translate-y-1 transition-all duration-300">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">Comprehensive Support</h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-[280px]">
                Enjoy comprehensive post-sales service, hardware diagnostics, and warranty processing assistance with no hassle.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Information Section */}
      <section className="py-16 bg-gradient-to-b from-card to-background border-y border-muted relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.15)_1px,transparent_1px)] bg-[length:16px_16px]" />
        <div className="container mx-auto px-4 max-w-3xl text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase">
            <span>Technology Partner</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
            Crafted by Jia Pixel
          </h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            This high-performance e-commerce platform is designed, built, and optimized by Jia Pixel, the{' '}
            <a
              href="https://www.jiapixel.com"
              target="_blank"
              rel="noopener"
              className="text-primary font-semibold hover:underline transition-all"
            >
              Leading Digital Agency In Bangladesh
            </a>
            . Our team is dedicated to engineering custom digital solutions with superior speed and seamless user experiences. We merge cutting-edge aesthetics with clean, scalable code to elevate tech brands and accelerate their digital growth.
          </p>
        </div>
      </section>

      {/* Call To Action Section */}
      <section className="py-20 text-center relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10 space-y-6">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Upgrade Your Setup with Omor Auto Corner
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Browse our premium collection of DOT/ECE helmets, genuine engine oils, tyres, and modification gear today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Link href="/shop" passHref>
              <Button size="lg" className="rounded-full px-8 py-6 font-black uppercase text-sm tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Shop Products <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact" passHref>
              <Button size="lg" variant="outline" className="rounded-full px-8 py-6 font-bold text-sm transition-all hover:bg-muted/50">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
