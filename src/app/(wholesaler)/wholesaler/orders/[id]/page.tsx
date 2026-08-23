'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    AlertCircle,
    Loader2,
    MapPin,
    FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';

interface OrderItem {
    name: string;
    image?: string;
    color?: string;
    size?: string;
    price: number;
    quantity: number;
}

interface ShippingAddress {
    fullName: string;
    phone: string;
    email?: string;
    street: string;
    city: string;
    state: string;
    division: string;
    zipCode: string;
}

interface Order {
    _id: string;
    status: string;
    createdAt: string;
    items: OrderItem[];
    totalAmount: number;
    deliveryCharge: number;
    paymentMethod: string;
    paymentStatus: string;
    shippingAddress?: ShippingAddress;
}

interface Settings {
    brandName?: string;
    contact?: {
        email?: string;
        phone?: string;
        address?: string;
    };
}

export default function WholesalerOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session, status } = useSession();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const [orderRes, settingsRes] = await Promise.all([
                    fetch(`/api/orders/${id}`),
                    fetch('/api/settings')
                ]);

                if (orderRes.ok) {
                    setOrder(await orderRes.json());
                } else {
                    toast.error('Failed to load order details');
                }

                if (settingsRes.ok) {
                    setSettings(await settingsRes.json());
                }
            } catch (error) {
                toast.error('An error occurred while loading data');
            } finally {
                setLoading(false);
            }
        }
        if (session?.user) {
            fetchData();
        } else if (status === 'unauthenticated') {
            Promise.resolve().then(() => setLoading(false));
        }
    }, [id, session, status]);

    const getStatusStep = (status: string) => {
        const statuses = ['Order Placed', 'Confirmed', 'Processing', 'Ready for Delivery', 'Released for Delivery', 'Delivered'];
        const idx = statuses.indexOf(status);
        return idx === -1 ? 0 : idx;
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center p-20 space-y-4">
                <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto opacity-20" />
                <h2 className="text-2xl font-bold">Order Not Found</h2>
                <Button onClick={() => router.push('/wholesaler/orders')}>Back to Orders</Button>
            </div>
        );
    }

    const currentStep = getStatusStep(order.status);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 py-6 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push('/wholesaler/orders')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black tracking-tight">Order Details</h1>
                            <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'secondary'}>
                                {order.status}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            ID: <span className="font-mono">{order._id}</span> • Ordered on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                
                {settings && (
                    <Button 
                        onClick={() => generateInvoicePDF(order, settings)}
                        className="font-bold flex items-center gap-2"
                    >
                        <FileText className="h-4 w-4" /> Download Invoice
                    </Button>
                )}
            </div>

            {/* Status Steps */}
            {order.status !== 'Cancelled' && (
                <Card className="border border-zinc-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            {/* Connection line for Desktop */}
                            <div className="absolute top-4 left-4 right-4 h-0.5 bg-zinc-100 hidden md:block -z-10" />
                            
                            {[
                                { title: 'Placed', icon: Clock, desc: 'Waiting confirmation' },
                                { title: 'Confirmed', icon: CheckCircle2, desc: 'Order approved' },
                                { title: 'Processing', icon: Package, desc: 'Production started' },
                                { title: 'Ready', icon: Package, desc: 'Ready for shipping' },
                                { title: 'Shipped', icon: Truck, desc: 'In transit' },
                                { title: 'Delivered', icon: CheckCircle2, desc: 'Received successfully' }
                            ].map((step, idx) => {
                                const Icon = step.icon;
                                const isDone = currentStep >= idx;
                                const isCurrent = currentStep === idx;
                                return (
                                    <div key={idx} className="flex md:flex-col items-center gap-3 md:text-center flex-1">
                                        <div className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                            isDone ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20' : 
                                            isCurrent ? 'border-primary text-primary bg-background' : 'border-zinc-200 text-zinc-300 bg-background'
                                        }`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className={`text-xs font-bold ${isDone || isCurrent ? 'text-zinc-900' : 'text-zinc-400'}`}>
                                                {step.title}
                                            </div>
                                            <p className="text-[10px] text-zinc-400 leading-normal hidden md:block mt-0.5">{step.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left side: items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50 border-b border-zinc-100">
                            <CardTitle className="text-base font-bold text-zinc-800">Order Items</CardTitle>
                        </CardHeader>
                        <CardContent className="divide-y divide-zinc-100 p-0">
                            {order.items.map((item: OrderItem, idx: number) => (
                                <div key={idx} className="flex gap-4 p-4 items-center">
                                    <div className="relative h-16 w-16 rounded-lg border border-zinc-100 overflow-hidden bg-zinc-50 flex-shrink-0">
                                        {item.image ? (
                                            <Image 
                                                src={item.image} 
                                                alt={item.name} 
                                                fill 
                                                className="object-cover" 
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-zinc-300">
                                                <Package className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-zinc-900 text-sm truncate">{item.name}</h4>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {item.color && (
                                                <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium">
                                                    Color: {item.color}
                                                </Badge>
                                            )}
                                            {item.size && (
                                                <Badge variant="outline" className="text-[10px] py-0 px-2 font-medium">
                                                    Size: {item.size}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-zinc-900 text-sm">
                                            ৳{Math.round(item.price * item.quantity).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-zinc-400 mt-0.5">
                                            ৳{Math.round(item.price).toLocaleString()} x {item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Cost summary */}
                    <Card className="border border-zinc-200 shadow-sm">
                        <CardContent className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500 font-medium">Subtotal</span>
                                <span className="font-bold text-zinc-800">৳{Math.round(order.totalAmount - (order.deliveryCharge || 0)).toLocaleString()}</span>
                            </div>
                            {order.deliveryCharge > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-500 font-medium">Delivery Charge</span>
                                    <span className="font-bold text-zinc-800">৳{Math.round(order.deliveryCharge).toLocaleString()}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between text-base">
                                <span className="text-zinc-900 font-black">Total</span>
                                <span className="font-black text-primary text-lg">৳{Math.round(order.totalAmount).toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right side: delivery info */}
                <div className="space-y-6">
                    <Card className="border border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-zinc-500" />
                                Shipping Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2.5 text-sm">
                            <div>
                                <div className="text-xs text-zinc-400 font-bold">Recipient</div>
                                <div className="font-bold text-zinc-800">{order.shippingAddress?.fullName}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-400 font-bold">Phone Number</div>
                                <div className="font-bold text-zinc-800">{order.shippingAddress?.phone}</div>
                            </div>
                            {order.shippingAddress?.email && (
                                <div>
                                    <div className="text-xs text-zinc-400 font-bold">Email Address</div>
                                    <div className="font-medium text-zinc-600">{order.shippingAddress.email}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-zinc-400 font-bold">Address</div>
                                <div className="font-medium text-zinc-600 leading-relaxed">
                                    {order.shippingAddress?.street}, <br />
                                    {order.shippingAddress?.city}, {order.shippingAddress?.state} <br />
                                    {order.shippingAddress?.division} - {order.shippingAddress?.zipCode}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-zinc-200 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                Payment details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Method</span>
                                <Badge variant="outline" className="font-bold">{order.paymentMethod}</Badge>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500 font-medium">Status</span>
                                <Badge 
                                    className="font-bold" 
                                    variant={order.paymentStatus === 'Paid' ? 'default' : 'secondary'}
                                >
                                    {order.paymentStatus}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
