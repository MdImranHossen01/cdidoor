import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';

// Since this is a public page, we can fetch the showrooms directly in a React Server Component (RSC)
async function getShowrooms() {
  try {
    await connectToDatabase();
    return await Showroom.find({ isActive: true })
      .populate('manager', 'name email phone image')
      .sort({ name: 1 });
  } catch (error) {
    console.error('Error fetching showrooms:', error);
    return [];
  }
}

export const metadata = {
  title: 'Our Showrooms | CDI Door Ind',
  description: 'Visit our premium door showrooms across Bangladesh to experience our exquisite solid wood, flush, and designer doors first-hand.',
};

export default async function PublicShowroomsPage() {
  const showrooms = await getShowrooms();

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      {/* Hero Banner */}
      <div className="relative bg-zinc-950 text-white py-24 overflow-hidden border-b border-white/[0.05]">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/35 via-zinc-950 to-zinc-950"></div>
        <div className="container mx-auto px-4 text-center relative z-10 space-y-4">
          <span className="text-primary font-bold uppercase tracking-widest text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Experience CDI Quality
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-white">
            OUR <span className="text-primary">SHOWROOMS</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base font-medium">
            Visit any of our 10 retail showrooms located across Bangladesh to touch, feel, and choose the perfect doors for your dream space.
          </p>
        </div>
      </div>

      {/* Showrooms Grid */}
      <div className="container mx-auto px-4 py-16">
        {showrooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 shadow-sm max-w-md mx-auto">
            <MapPin className="h-12 w-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-800">No Showrooms Available</h3>
            <p className="text-zinc-500 text-sm mt-1">We are currently updating our showroom directory. Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {showrooms.map((showroom: any) => (
              <Link 
                href={`/showrooms/${showroom._id}`}
                key={showroom._id} 
                className="group bg-white rounded-2xl border border-zinc-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Showroom Image */}
                <div className="relative h-60 w-full bg-zinc-900 overflow-hidden">
                  {showroom.image ? (
                    <img 
                      src={showroom.image} 
                      alt={showroom.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                      <MapPin className="h-10 w-10 text-zinc-500 animate-pulse" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-primary/95 text-black font-black text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm">
                      Retail Store
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-zinc-950 group-hover:text-primary transition-colors">
                      {showroom.name}
                    </h3>
                    
                    <div className="flex items-start gap-2.5 text-zinc-600 text-sm leading-relaxed">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{showroom.address || 'Address coming soon'}</span>
                    </div>
                  </div>

                  {/* Contact & Details */}
                  <div className="pt-4 border-t border-zinc-100 space-y-2.5 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Sat - Thu: 9:00 AM - 8:00 PM</span>
                    </div>
                    {showroom.manager && (() => {
                      const manager = showroom.manager as any;
                      return (
                        <div className="flex items-center gap-3 pt-3 border-t border-zinc-100 mt-2">
                          {manager.image ? (
                            <img src={manager.image} alt={manager.name} className="h-10 w-10 object-cover rounded-full border border-zinc-200" />
                          ) : (
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                              {manager.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Manager</p>
                            <p className="text-xs font-bold text-zinc-800 truncate">{manager.name}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{manager.email}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
