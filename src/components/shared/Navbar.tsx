'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white px-6 shadow-sm">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl text-navyBg">
        <div className="w-7 h-7 rounded-full bg-navyBg flex items-center justify-center text-white">
          <Heart className="h-4 w-4 text-accentPink fill-accentPink" />
        </div>
        <span className="font-extrabold text-lg text-navyBg tracking-tight">HealthCare</span>
      </Link>

      <div className="flex items-center gap-4">
        {session?.user && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-black text-slate-800">{session.user.name}</p>
              <div className="mt-0.5">
                {session.user.role === 'ADMIN' && (
                  <span className="px-2 py-0.5 rounded-full bg-accentYellow text-yellow-900 text-[9px] font-black uppercase">
                    Admin
                  </span>
                )}
                {session.user.role === 'DOCTOR' && (
                  <span className="px-2 py-0.5 rounded-full bg-accentBlue text-blue-900 text-[9px] font-black uppercase">
                    Doctor
                  </span>
                )}
                {session.user.role === 'PATIENT' && (
                  <span className="px-2 py-0.5 rounded-full bg-accentGreen text-emerald-900 text-[9px] font-black uppercase">
                    Patient
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-[10px] font-bold h-8 px-4 rounded-full border-slate-300 hover:bg-slate-50 text-slate-700 transition"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
