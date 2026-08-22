'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginSchema, LoginInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Heart, Shield, Stethoscope, User } from 'lucide-react';

const customResolver = (schema: any) => async (values: any) => {
  try {
    const data = schema.parse(values);
    return { values: data, errors: {} };
  } catch (err: any) {
    const errors: any = {};
    if (err.errors) {
      err.errors.forEach((e: any) => {
        const path = e.path.join('.');
        errors[path] = { message: e.message, type: 'validation' };
      });
    }
    return { values: {}, errors };
  }
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: customResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
      } else {
        const meRes = await fetch('/api/user/me');
        if (meRes.ok) {
          const user = await meRes.json();
          if (user.role === 'ADMIN') {
            router.push('/admin');
          } else if (user.role === 'DOCTOR') {
            router.push('/doctor');
          } else {
            router.push('/patient');
          }
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Helper to fill credentials for testing
  const handleQuickLogin = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F2CEE2] p-4">
      <Card className="w-full max-w-md rounded-[32px] shadow-2xl border border-white/50 bg-[#FDFBFE] p-2">
        <CardHeader className="space-y-2 pt-6">
          <div className="flex justify-center mb-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-navyBg flex items-center justify-center text-white">
                <Heart className="h-5 w-5 text-accentPink fill-accentPink" />
              </div>
              <span className="font-extrabold text-xl text-navyBg tracking-tight">HealthCare</span>
            </Link>
          </div>
          <CardTitle className="text-xl text-center font-black text-navyBg uppercase tracking-tight">
            Portal Access Lock
          </CardTitle>
          <CardDescription className="text-center text-xs font-semibold text-slate-500">
            Enter credentials below or select a quick-access credential.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                disabled={isLoading}
                className="rounded-full border-slate-200 focus:border-navyBg focus:ring-1 focus:ring-navyBg text-xs font-semibold px-4 h-10"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-[10px] text-red-600 font-semibold">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className="rounded-full border-slate-200 focus:border-navyBg focus:ring-1 focus:ring-navyBg text-xs font-semibold px-4 h-10"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-[10px] text-red-600 font-semibold">{errors.password.message}</p>
              )}
            </div>

            {/* Quick Login Shortcuts */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block text-center">
                Quick Demo Accounts (Click to Fill)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@healthcare.local', 'admin123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-accentYellow/15 border border-accentYellow hover:bg-accentYellow/30 transition text-[9px] font-bold text-yellow-950"
                >
                  <Shield className="h-3.5 w-3.5 mb-1" />
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('doctor.smith@healthcare.local', 'doctor123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-accentBlue/15 border border-accentBlue hover:bg-accentBlue/30 transition text-[9px] font-bold text-blue-950"
                >
                  <Stethoscope className="h-3.5 w-3.5 mb-1" />
                  Doctor
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('patient.alice@healthcare.local', 'patient123')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-accentGreen/15 border border-accentGreen hover:bg-accentGreen/30 transition text-[9px] font-bold text-emerald-950"
                >
                  <User className="h-3.5 w-3.5 mb-1" />
                  Patient
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pb-6">
            <Button
              className="w-full bg-navyBg hover:bg-navyBg/90 text-white font-bold rounded-full py-2.5"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Unlocking Session...' : 'Sign In To Portal'}
            </Button>
            <p className="text-xs text-center text-slate-500 font-medium">
              New patient?{' '}
              <Link className="text-navyBg font-extrabold hover:underline" href="/register">
                Register An Account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F2CEE2]">
        <div className="text-navyBg text-sm font-black">Loading Auth Modules...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
