import { MapPin, Phone, Mail, Clock, ArrowLeft, PackageOpen } from 'lucide-react';
import Link from 'next/link';
import connectToDatabase from '@/lib/db';
import Showroom from '@/models/Showroom';
import Product from '@/models/Product';
import { ProductCardSelector } from '@/components/templates/Registry';

async function getShowroomDetails(id: string) {
  try {
    await connectToDatabase();
    const showroom = await Showroom.findById(id).populate('manager', 'name email phone image');
    if (!showroom || !showroom.isActive) return null;

    // Fetch products that have stock in this showroom
    const products = await Product.find({
      'showroomStocks.showroom': id
    }).sort({ name: 1 });

    return { showroom, products };
  } catch (error) {
    console.error('Error fetching showroom details:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const showroom = await Showroom.findById(id);
    if (!showroom) return { title: 'Showroom Not Found | CDI Door Ind' };
    return {
      title: `${showroom.name} | CDI Door Ind`,
      description: `Browse products and view details for ${showroom.name} located at ${showroom.address}.`,
    };
  } catch {
    return { title: 'Showroom Details | CDI Door Ind' };
  }
}

export default async function ShowroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShowroomDetails(id);

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-32 text-center space-y-4">
        <MapPin className="h-16 w-16 text-zinc-300 mx-auto" />
        <h1 className="text-3xl font-black text-zinc-800">Showroom Not Found</h1>
        <p className="text-zinc-500">The showroom you are looking for does not exist or is inactive.</p>
        <Link href="/showrooms" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Showrooms
        </Link>
      </div>
    );
  }

  const { showroom, products } = data;

  return (
    <div className="bg-zinc-50 min-h-screen pb-20">
      {/* Back navigation */}
      <div className="container mx-auto px-4 pt-6">
        <Link href="/showrooms" className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-950 font-bold transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Showrooms
        </Link>
      </div>

      {/* Showroom Hero Panel */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-zinc-200/80 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 lg:p-8">
          {/* Image */}
          <div className="lg:col-span-7 relative h-72 lg:h-[400px] w-full rounded-2xl overflow-hidden bg-zinc-900 shadow-inner">
            {showroom.image ? (
              <img 
                src={showroom.image} 
                alt={showroom.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                <MapPin className="h-12 w-12 text-zinc-500" />
              </div>
            )}
            <div className="absolute top-4 left-4 bg-primary/95 text-black font-black text-xs uppercase px-3 py-1.5 rounded-lg shadow-md">
              Active Showroom
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-8 py-2">
            <div className="space-y-6">
              <h1 className="text-3xl lg:text-4xl font-black text-zinc-950 tracking-tight leading-none">
                {showroom.name}
              </h1>

              <div className="space-y-4">
                <div className="flex items-start gap-3 text-zinc-700 leading-relaxed">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="font-medium">{showroom.address || 'Address N/A'}</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-700">
                  <Clock className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-medium">Sat - Thu: 9:00 AM - 8:00 PM</span>
                </div>
              </div>
            </div>

            {/* Manager Contact Card */}
            {showroom.manager && (() => {
              const manager = showroom.manager as any;
              return (
                <div className="bg-zinc-50 rounded-2xl border border-zinc-200/80 p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-4 border-b border-zinc-200/60 pb-3">
                    {manager.image ? (
                      <img src={manager.image} alt={manager.name} className="h-12 w-12 object-cover rounded-full border border-zinc-300" />
                    ) : (
                      <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                        {manager.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Showroom Manager</p>
                      <p className="text-lg font-bold text-zinc-900 leading-tight mt-0.5">{manager.name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-zinc-600">
                    <div className="flex items-center gap-2.5">
                      <Phone className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium">{manager.phone || '+880 1700-000000'}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Mail className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium">{manager.email}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Showroom Products Listing */}
      <div className="container mx-auto px-4 py-12">
        <div className="border-b border-zinc-200 pb-4 mb-8">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            Products In This Showroom ({products.length})
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Explore live inventory available directly at {showroom.name}.</p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-zinc-200/80 shadow-sm max-w-md mx-auto space-y-4">
            <PackageOpen className="h-16 w-16 text-zinc-300 mx-auto" />
            <h3 className="text-lg font-bold text-zinc-800">No Products Listed Yet</h3>
            <p className="text-zinc-500 text-sm">We are currently setting up inventory displays for this showroom. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              // Extract the showroom-specific stock count
              const showroomStock = product.showroomStocks?.find(
                (s: any) => s.showroom.toString() === showroom._id.toString()
              )?.stock || 0;

              return (
                <div key={product._id.toString()} className="relative flex flex-col">
                  {/* Badge showing showroom stock status */}
                  <div className="absolute top-2 right-2 z-10">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm ${showroomStock > 0 ? 'bg-green-150 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {showroomStock > 0 ? `${showroomStock} In Stock` : 'Out of Stock'}
                    </span>
                  </div>
                  <ProductCardSelector style="v6" product={product} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
