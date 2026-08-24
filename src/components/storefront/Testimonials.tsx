'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote, Star } from "lucide-react";

import { useSettings } from "@/components/SettingsProvider";
import { useLanguage } from "@/contexts/LanguageContext";

const fallbackReviews = [
  {
    name: "Ariful Islam",
    role: "Verified Buyer",
    content: "এখান থেকে ঘরের জন্য সেগুন কাঠের দরজা নিয়েছিলাম। কাঠের সিজনিং চমৎকার এবং নকশা নিখুঁত হয়েছে। অনলাইন অর্ডারে প্রথমে কিছুটা চিন্তিত ছিলাম, কিন্তু তাদের ডেলিভারি ও কাজের মান আমায় সন্তুষ্ট করেছে।",
    image: "https://i.pravatar.cc/80?u=1",
    rating: 5
  },
  {
    name: "Sadia Afrin",
    role: "Regular Customer",
    content: "দারুণ কাস্টমার সার্ভিস! সঠিক মাপ ও কাঠের ধরন বেছে নিতে তারা অনেক সাহায্য করেছেন। চেকআউট থেকে শুরু করে সঠিক সময়ে বাড়িতে এসে দরজা পৌঁছে দেওয়া—পুরো প্রক্রিয়াটি খুব সহজ ছিল।",
    image: "https://i.pravatar.cc/80?u=2",
    rating: 5
  },
  {
    name: "Tanvir Ahmed",
    role: "Verified Buyer",
    content: "আমি তাদের গামারি কাঠের ল্যামিনেটেড দরজা অর্ডার করেছিলাম। দরজার ফিনিশিং এবং পলিশের কাজ অসাধারণ। ট্রান্সপোর্টে যাতে কোনো ক্ষতি না হয় সেজন্য প্যাকেজিং খুবই মজবুত ছিল।",
    image: "https://i.pravatar.cc/80?u=3",
    rating: 5
  },
  {
    name: "Nusrat Jahan",
    role: "Verified Buyer",
    content: "বাজারে যাচাই করে দেখেছি, অন্যান্য দোকানের তুলনায় এখানে কাঠের মান ও দামের সামঞ্জস্য খুবই ভালো। আমাদের নতুন ফ্লাটের সবকটি দরজা এখান থেকেই বানিয়েছি এবং সবাই ডিজাইনগুলোর প্রশংসা করছে।",
    image: "https://i.pravatar.cc/80?u=4",
    rating: 5
  }
];

export function Testimonials() {
  const { t } = useLanguage();
  const settings = useSettings();
  const reviews = settings?.testimonials && settings.testimonials.length > 0
    ? settings.testimonials
    : fallbackReviews;

  return (
    <section className="py-12 md:py-20 overflow-hidden font-jost">
      <div className="container mx-auto px-4 md:px-0">
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4 text-center md:text-left max-w-xl">
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter">
              {t('store.home.testimonials.title_start') || 'What our'} <span className="text-primary italic">{t('store.home.testimonials.title_highlight') || 'Customers'}</span> {t('store.home.testimonials.title_end') || 'say'}
            </h2>
            <p className="text-muted-foreground font-medium">
              {t('store.home.testimonials.desc') || 'Don\'t just take our word for it. Join thousands of happy customers all over Bangladesh!'}
            </p>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <div className="flex -space-x-3">
              {reviews.slice(0, 3).map((r, i) => (
                <Avatar key={i} className="border-2 border-white size-10">
                  <AvatarImage src={r.image} alt={`${r.name} avatar`} />
                  <AvatarFallback>{r.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="text-sm font-bold pl-2">
              <div className="flex text-yellow-500 scale-75 -ml-4 mb-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="fill-current size-3" />
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground italic font-black">4.9/5 Average Rating</p>
            </div>
          </div>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {reviews.map((review, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <div className="h-full border bg-card rounded-[2.5rem] p-8 md:p-10 flex flex-col hover:border-primary/20 transition-colors group relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 text-primary/5 group-hover:text-primary/10 transition-colors">
                    <Quote className="size-32 fill-current" />
                  </div>
                  <div className="flex text-yellow-500 gap-1 mb-6">
                    {[...Array(review.rating || 5)].map((_, i) => (
                      <Star key={i} className="fill-current size-4" />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed mb-8 flex-1 italic text-muted-foreground font-medium">
                    &quot;{review.content}&quot;
                  </p>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-12 rounded-full border-2 border-primary/20 shadow-lg shadow-primary/10">
                      <AvatarImage src={review.image} alt={review.name} />
                      <AvatarFallback>{review.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold">{review.name}</p>
                      <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">{review.role}</p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}

