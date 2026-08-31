'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, GalleryVerticalEnd, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Logo } from '@/components/ui/logo';

const loginSchema = z.object({
  email: z.string().min(1, { message: 'Email or phone number is required' }).refine(
    (val) => {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const isPhone = /^[0-9]{11,}$/.test(val);
      return isEmail || isPhone;
    },
    { message: 'Please enter a valid email or phone number' }
  ),
  password: z.string().optional().or(z.literal('')),
});

export default function LoginPage() {
  const { t } = useLanguage();

  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated based on role
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role;
      if (role === 'admin' || role === 'super_admin' || role === 'manager') {
        router.replace('/admin/dashboard');
      } else if (role === 'showroom_manager') {
        router.replace('/showroom/dashboard');
      } else if (role === 'employee') {
        router.replace('/employee/dashboard');
      } else if (role === 'wholesaler') {
        router.replace('/wholesaler/dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [status, session, router]);

  async function loginWithGoogle() {
    setIsGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/login' });
    } catch (error) {
      setIsGoogleLoading(false);
      toast.error('Failed to log in with Google.');
    }
  }

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const response = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (response?.error) {
        if (response.error === 'CredentialsSignin' || response.error === 'CallbackRouteError' || response.error === 'Configuration') {
          toast.error(t('auth.login.invalid_credentials') || 'Invalid email/phone number or password.');
        } else {
          toast.error(response.error);
        }
      } else {
        toast.success('Logged in successfully!');
        // Redirect to /dashboard â€” proxy will read fresh JWT and redirect to correct role-based dashboard
        window.location.replace('/dashboard');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      {/* Login Form centered */}
      <div className="flex flex-col p-6 md:p-10 bg-background min-h-screen items-center justify-center w-full">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-1 items-center justify-center"
        >
          <div className="w-full max-w-sm space-y-8">
            <div className="space-y-2 text-center">
              <h1 className="text-3xl font-bold tracking-tight">{t('auth.login.welcome') || 'Welcome back'}</h1>
              <p className="text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>

            <div className="grid gap-4">
              <Button
                variant="outline"
                className="w-full h-11 transition-all hover:bg-muted/50 hover:border-primary/50 group"
                onClick={loginWithGoogle}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 488 512"
                  >
                    <path
                      fill="currentColor"
                      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    ></path>
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-4 text-muted-foreground">
                    email or phone
                  </span>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('auth.login.email_phone') || 'Email or Phone Number'}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email@example.com or 017xxxxxxxx"
                            type="text"
                            {...field}
                            disabled={isLoading || isGoogleLoading}
                            className="h-11 focus-visible:ring-primary/20"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>{t('auth.login.password') || 'Password'}</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-foreground/80 hover:text-primary hover:underline underline-offset-4 transition-colors"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Enter your password"
                              type={showPassword ? "text" : "password"}
                              {...field}
                              disabled={isLoading || isGoogleLoading}
                              className="h-11 focus-visible:ring-primary/20 pr-10"
                            />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-r-lg outline-none flex items-center justify-center"
                                    disabled={isLoading || isGoogleLoading}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                  >
                                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{showPassword ? "Hide password" : "Show password"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01] active:scale-[0.99]"
                    disabled={isLoading || isGoogleLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <span className="flex items-center justify-center">
                        {t('auth.login.sign_in') || 'Sign In'} <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-bold text-foreground/90 hover:text-primary hover:underline underline-offset-4 transition-colors">
                Create an account
              </Link>
            </div>
          </div>
        </motion.div>


      </div>
    </main>
  );
}

