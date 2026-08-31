'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Truck, CreditCard, Globe, X, BarChart3, Settings2, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from '@/contexts/LanguageContext';

const marketingSettingsSchema = z.object({
  subscriptionConfig: z.object({
    activationThreshold: z.number().min(0, 'Threshold cannot be negative'),
    rewardPercentage: z.number().min(0, 'Percentage cannot be negative').max(100, 'Cannot exceed 100%'),
  }).optional(),
  deliveryChargeInsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  deliveryChargeOutsideDhaka: z.number().min(0, 'Charge cannot be negative').optional(),
  paymentConfig: z.object({
    activeMethod: z.string().default('none'),
    sslcommerz: z.object({
      storeId: z.string().nullish().transform(val => val ?? ''),
      storePassword: z.string().nullish().transform(val => val ?? ''),
      isSandbox: z.boolean().default(true),
    }).nullable().optional(),
  }).optional(),
  manualPaymentConfig: z.object({
    bkash: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    nagad: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    rocket: z.object({
      number: z.string().default(''),
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    banglaQr: z.object({
      qrCode: z.string().nullish().transform(val => val ?? ''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    bank: z.object({
      bankName: z.string().default(''),
      accountNumber: z.string().default(''),
      routingNumber: z.string().default(''),
      branchName: z.string().default(''),
      active: z.boolean().default(false),
    }).nullable().optional(),
    instructions: z.string().nullish().transform(val => val ?? ''),
  }).optional(),
  courierConfig: z.object({
    activeProvider: z.string().default('none'),
    steadfast: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
      secretKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    pathao: z.object({
      clientId: z.string().nullish().transform(val => val ?? ''),
      clientSecret: z.string().nullish().transform(val => val ?? ''),
      storeId: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    redx: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
    bdCourier: z.object({
      apiKey: z.string().nullish().transform(val => val ?? ''),
    }).nullable().optional(),
  }).optional(),
  facebookDomainVerification: z.string().nullish().transform(val => val ?? ''),
  metaPixelId: z.string().nullish().transform(val => val ?? ''),
  facebookAccessToken: z.string().nullish().transform(val => val ?? ''),
  facebookTestEventCode: z.string().nullish().transform(val => val ?? ''),
  googleTagManagerId: z.string().nullish().transform(val => val ?? ''),
  tiktokPixelId: z.string().nullish().transform(val => val ?? ''),
  tiktokAccessToken: z.string().nullish().transform(val => val ?? ''),
});

type MarketingSettingsFormValues = z.infer<typeof marketingSettingsSchema>;

export default function MarketingSettingsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MarketingSettingsFormValues>({
    resolver: zodResolver(marketingSettingsSchema) as any,
    defaultValues: {
      subscriptionConfig: {
        activationThreshold: 5000,
        rewardPercentage: 5,
      },
      deliveryChargeInsideDhaka: 60,
      deliveryChargeOutsideDhaka: 120,
      paymentConfig: {
        activeMethod: 'none',
        sslcommerz: {
          storeId: '',
          storePassword: '',
          isSandbox: true,
        },
      },
      manualPaymentConfig: {
        bkash: { number: '', qrCode: '', active: false },
        nagad: { number: '', qrCode: '', active: false },
        rocket: { number: '', qrCode: '', active: false },
        banglaQr: { qrCode: '', active: false },
        bank: { bankName: '', accountNumber: '', routingNumber: '', branchName: '', active: false },
        instructions: '',
      },
      courierConfig: {
        activeProvider: 'none',
        steadfast: { apiKey: '', secretKey: '' },
        pathao: { clientId: '', clientSecret: '', storeId: '' },
        redx: { apiKey: '' },
        bdCourier: { apiKey: '' },
      },
      facebookDomainVerification: '',
      metaPixelId: '',
      facebookAccessToken: '',
      facebookTestEventCode: '',
      googleTagManagerId: '',
      tiktokPixelId: '',
      tiktokAccessToken: '',
    },
  });

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings', { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();

          const result = marketingSettingsSchema.safeParse(data);
          if (result.success) {
            if (!controller.signal.aborted) {
              const sanitizedData: MarketingSettingsFormValues = {
                subscriptionConfig: {
                  activationThreshold: result.data.subscriptionConfig?.activationThreshold ?? 5000,
                  rewardPercentage: result.data.subscriptionConfig?.rewardPercentage ?? 5,
                },
                deliveryChargeInsideDhaka: result.data.deliveryChargeInsideDhaka ?? 60,
                deliveryChargeOutsideDhaka: result.data.deliveryChargeOutsideDhaka ?? 120,
                paymentConfig: {
                  activeMethod: result.data.paymentConfig?.activeMethod || 'none',
                  sslcommerz: {
                    storeId: result.data.paymentConfig?.sslcommerz?.storeId || '',
                    storePassword: result.data.paymentConfig?.sslcommerz?.storePassword || '',
                    isSandbox: result.data.paymentConfig?.sslcommerz?.isSandbox ?? true,
                  },
                },
                manualPaymentConfig: {
                  bkash: {
                    number: result.data.manualPaymentConfig?.bkash?.number || '',
                    qrCode: result.data.manualPaymentConfig?.bkash?.qrCode || '',
                    active: result.data.manualPaymentConfig?.bkash?.active ?? false,
                  },
                  nagad: {
                    number: result.data.manualPaymentConfig?.nagad?.number || '',
                    qrCode: result.data.manualPaymentConfig?.nagad?.qrCode || '',
                    active: result.data.manualPaymentConfig?.nagad?.active ?? false,
                  },
                  rocket: {
                    number: result.data.manualPaymentConfig?.rocket?.number || '',
                    qrCode: result.data.manualPaymentConfig?.rocket?.qrCode || '',
                    active: result.data.manualPaymentConfig?.rocket?.active ?? false,
                  },
                  banglaQr: {
                    qrCode: result.data.manualPaymentConfig?.banglaQr?.qrCode || '',
                    active: result.data.manualPaymentConfig?.banglaQr?.active ?? false,
                  },
                  bank: {
                    bankName: result.data.manualPaymentConfig?.bank?.bankName || '',
                    accountNumber: result.data.manualPaymentConfig?.bank?.accountNumber || '',
                    routingNumber: result.data.manualPaymentConfig?.bank?.routingNumber || '',
                    branchName: result.data.manualPaymentConfig?.bank?.branchName || '',
                    active: result.data.manualPaymentConfig?.bank?.active ?? false,
                  },
                  instructions: result.data.manualPaymentConfig?.instructions || '',
                },
                courierConfig: {
                  activeProvider: result.data.courierConfig?.activeProvider || 'none',
                  steadfast: {
                    apiKey: result.data.courierConfig?.steadfast?.apiKey || '',
                    secretKey: result.data.courierConfig?.steadfast?.secretKey || '',
                  },
                  pathao: {
                    clientId: result.data.courierConfig?.pathao?.clientId || '',
                    clientSecret: result.data.courierConfig?.pathao?.clientSecret || '',
                    storeId: result.data.courierConfig?.pathao?.storeId || '',
                  },
                  redx: {
                    apiKey: result.data.courierConfig?.redx?.apiKey || '',
                  },
                  bdCourier: {
                    apiKey: result.data.courierConfig?.bdCourier?.apiKey || '',
                  },
                },
                facebookDomainVerification: result.data.facebookDomainVerification || '',
                metaPixelId: result.data.metaPixelId || '',
                facebookAccessToken: result.data.facebookAccessToken || '',
                facebookTestEventCode: result.data.facebookTestEventCode || '',
                googleTagManagerId: result.data.googleTagManagerId || '',
                tiktokPixelId: result.data.tiktokPixelId || '',
                tiktokAccessToken: result.data.tiktokAccessToken || '',
              };
              form.reset(sanitizedData);
            }
          } else {
            console.error('Settings validation failed:', result.error);
            toast.error(t("marketing.invalid_settings") as string);
          }
        } else {
          if (!controller.signal.aborted) {
            toast.error(`${t("marketing.failed_load")}: ${res.status} ${res.statusText}`);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        if (!controller.signal.aborted) {
          toast.error(t("marketing.failed_load") as string);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchSettings();
    return () => controller.abort();
  }, [form]);

  const onSubmit = async (values: MarketingSettingsFormValues) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        toast.success(t("marketing.settings_updated") as string);
      } else {
        toast.error(t("marketing.failed_update") as string);
      }
    } catch (error) {
      toast.error(t("marketing.error_updating") as string);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 px-[1px] pt-[1px] pb-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 w-full px-[1px] md:px-0 mb-[1px] md:mb-0">
        <h1 className="hidden md:block text-2xl font-bold tracking-tight">{t("marketing.title")}</h1>
        <Button type="submit" form="marketing-settings-form" disabled={submitting} className="w-full md:w-auto">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("marketing.save_changes")}
        </Button>
      </div>

      <Form {...form}>
        <form id="marketing-settings-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="loyalty" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[480px]">
              <TabsTrigger value="loyalty">{t("marketing.tab_loyalty")}</TabsTrigger>
              <TabsTrigger value="payment">{t("marketing.tab_payment")}</TabsTrigger>
              <TabsTrigger value="courier">{t("marketing.tab_courier")}</TabsTrigger>
              <TabsTrigger value="marketing">{t("marketing.tab_marketing")}</TabsTrigger>
            </TabsList>

            {/* 1. Loyalty Tab */}
            <TabsContent value="loyalty" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("marketing.loyalty_title")}</CardTitle>
                  <CardDescription>{t("marketing.loyalty_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="subscriptionConfig.activationThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("marketing.activation_threshold")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5000"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>{t("marketing.activation_desc")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subscriptionConfig.rewardPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("marketing.reward_percentage")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="5"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>{t("marketing.reward_desc")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg border p-4 bg-primary/5">
                    <h4 className="text-sm font-bold mb-2">{t("marketing.how_it_works")}</h4>
                    <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                      <li>{t("marketing.loyalty_rule_1")}</li>
                      <li>{t("marketing.loyalty_rule_2")}<strong>{t("marketing.active")}</strong>{t("marketing.loyalty_rule_2_after")}{form.watch('subscriptionConfig.activationThreshold')}{t("marketing.tk")}</li>
                      <li>{t("marketing.loyalty_rule_3")}<strong>{form.watch('subscriptionConfig.rewardPercentage')}</strong>{t("marketing.loyalty_rule_3_after")}</li>
                      <li>{t("marketing.loyalty_rule_4")}</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Payment Tab */}
            <TabsContent value="payment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> {t("marketing.payment_sslcommerz_title")}
                  </CardTitle>
                  <CardDescription>{t("marketing.payment_sslcommerz_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 py-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="paymentConfig.activeMethod"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">{t("marketing.active_payment_method")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder={t("marketing.select_active_method") as string} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{t("marketing.none_cod")}</SelectItem>
                              <SelectItem value="sslcommerz">{t("marketing.sslcommerz")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.isSandbox"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 pt-4 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value ?? true}
                              onChange={(e) => field.onChange(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </FormControl>
                          <FormLabel className="font-bold text-sm cursor-pointer">{t("marketing.enable_sandbox")}</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border">
                    <div className="md:col-span-2 font-black text-xs uppercase opacity-50 mb-2">{t("marketing.sslcommerz_credentials")}</div>
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.storeId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.store_id")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("marketing.store_id") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentConfig.sslcommerz.storePassword"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.store_password")}</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={t("marketing.store_password") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" /> {t("marketing.manual_payment_title")}
                  </CardTitle>
                  <CardDescription>{t("marketing.manual_payment_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 py-4 md:p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
                      <div key={method} className="space-y-4 p-4 rounded-2xl border bg-muted/10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Image src={`/assets/${method}logo.webp`} alt={method} width={24} height={24} className="h-6 w-6 object-contain" />
                            <span className="font-bold capitalize">{method}</span>
                          </div>
                          <FormField
                            control={form.control}
                            name={`manualPaymentConfig.${method}.active`}
                            render={({ field }) => (
                              <FormItem className="space-y-0">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value ?? false}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name={`manualPaymentConfig.${method}.number`}
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-[10px] uppercase opacity-60">{t("marketing.number")}</FormLabel>
                              <FormControl>
                                <Input placeholder="017XXXXXXXX" {...field} className="h-10 rounded-lg border px-3 text-sm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Bank Transfer Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8 mt-8">
                    <div className="md:col-span-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{t("marketing.bank_transfer_details")}</h4>
                          <p className="text-xs text-muted-foreground">{t("marketing.bank_transfer_desc")}</p>
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name="manualPaymentConfig.bank.active"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value ?? false}
                                onChange={(e) => field.onChange(e.target.checked)}
                                className="h-5 w-5 rounded-md border-primary text-primary focus:ring-primary"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bank.bankName"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-semibold text-gray-700">{t("marketing.bank_name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Islami Bank Bangladesh PLC" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bank.accountNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-semibold text-gray-700">{t("marketing.account_number")}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 20501234567890123" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bank.routingNumber"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-semibold text-gray-700">{t("marketing.routing_number")}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 125271429" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.bank.branchName"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-semibold text-gray-700">{t("marketing.branch_name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Motijheel Branch" {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Payment Instructions */}
                  <div className="border-t pt-8 mt-8 space-y-4">
                    <FormField
                      control={form.control}
                      name="manualPaymentConfig.instructions"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-sm">{t("marketing.payment_instructions")}</FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              rows={4}
                              placeholder={t("marketing.describe_instructions") as string}
                              className="w-full rounded-lg border p-3 text-xs bg-transparent border-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Courier Tab */}
            <TabsContent value="courier" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> {t("marketing.courier_title")}
                  </CardTitle>
                  <CardDescription>{t("marketing.courier_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 py-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1 space-y-4">
                    <FormField
                      control={form.control}
                      name="courierConfig.activeProvider"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">{t("marketing.active_provider")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl">
                                <SelectValue placeholder={t("marketing.select_provider") as string} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{t("marketing.none")}</SelectItem>
                              <SelectItem value="steadfast">{t("marketing.steadfast")}</SelectItem>
                              <SelectItem value="pathao">{t("marketing.pathao")}</SelectItem>
                              <SelectItem value="redx">{t("marketing.redx")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryChargeInsideDhaka"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">{t("marketing.inside_dhaka")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-12 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryChargeOutsideDhaka"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold">{t("marketing.outside_dhaka")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-12 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-2xl border">
                    <div className="md:col-span-2 font-black text-xs uppercase opacity-50 mb-2">{t("marketing.provider_credentials")}</div>
                    <FormField
                      control={form.control}
                      name="courierConfig.steadfast.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.steadfast_api_key")}</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={t("marketing.steadfast_api_key") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.steadfast.secretKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.steadfast_secret_key")}</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={t("marketing.steadfast_secret_key") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.pathao.storeId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.pathao_store_id")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("marketing.pathao_store_id") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.redx.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.redx_api_key")}</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={t("marketing.redx_api_key") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="courierConfig.bdCourier.apiKey"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.bd_courier_api_key")}</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={t("marketing.bd_courier_api_key") as string} {...field} className="h-10 rounded-lg border px-3 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Marketing Tab */}
            <TabsContent value="marketing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" /> {t("marketing.marketing_meta_title")}
                  </CardTitle>
                  <CardDescription>{t("marketing.marketing_meta_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 py-4 md:p-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="googleTagManagerId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">{t("marketing.gtm_id")}</FormLabel>
                        <FormControl>
                          <Input placeholder="GTM-XXXXXXX" {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormDescription>
                          {t("marketing.gtm_desc")}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="metaPixelId"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">{t("marketing.meta_pixel_id")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("marketing.meta_pixel_id") as string} {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="facebookAccessToken"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="font-bold text-xs">{t("marketing.fb_access_token")}</FormLabel>
                        <FormControl>
                          <Input type="text" placeholder={t("marketing.fb_access_token") as string} {...field} className="h-12 rounded-xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="facebookDomainVerification"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.fb_domain_verification")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("marketing.fb_domain_verification") as string} {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="facebookTestEventCode"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="font-bold text-xs">{t("marketing.fb_test_event_code")}</FormLabel>
                          <FormControl>
                            <Input placeholder={t("marketing.fb_test_event_code") as string} {...field} className="h-12 rounded-xl" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-6 mt-6">
                    <h4 className="font-black text-xs uppercase opacity-50 mb-4">{t("marketing.tiktok_pixel_events_api")}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tiktokPixelId"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-bold text-xs">{t("marketing.tiktok_pixel_id")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("marketing.tiktok_pixel_id") as string} {...field} className="h-12 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tiktokAccessToken"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="font-bold text-xs">{t("marketing.tiktok_access_token")}</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder={t("marketing.tiktok_access_token") as string} {...field} className="h-12 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
