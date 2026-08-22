'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerSchema, RegisterInput } from '@/lib/validations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Heart } from 'lucide-react';

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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: customResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Registration failed. Please try again.');
        setIsLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
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
            Patient Registration
          </CardTitle>
          <CardDescription className="text-center text-xs font-semibold text-slate-500">
            Create an account to book and manage appointments.
          </CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-4 py-8">
            <div className="p-4 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl text-center animate-pulse">
              Registration successful! Redirecting to login page...
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-3">
              {error && (
                <div className="p-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="name">
                  Full Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  disabled={isLoading}
                  className="rounded-full border-slate-200 focus:border-navyBg focus:ring-1 focus:ring-navyBg text-xs font-semibold px-4 h-10"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.name.message}</p>
                )}
              </div>
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
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="rounded-full border-slate-200 focus:border-navyBg focus:ring-1 focus:ring-navyBg text-xs font-semibold px-4 h-10"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-[10px] text-red-600 font-semibold">{errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pb-6">
              <Button
                className="w-full bg-navyBg hover:bg-navyBg/90 text-white font-bold rounded-full py-2.5"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Register'}
              </Button>
              <p className="text-xs text-center text-slate-500 font-medium">
                Already have an account?{' '}
                <Link className="text-navyBg font-extrabold hover:underline" href="/login">
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
