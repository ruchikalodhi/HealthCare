'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  LayoutDashboard,
  Calendar,
  Settings,
  HeartPulse,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const adminLinks = [
    {
      name: 'Overview',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Manage Doctors',
      href: '/admin/doctors',
      icon: Users,
    },
    {
      name: 'Onboard Doctor',
      href: '/admin/doctors/create',
      icon: UserPlus,
    },
  ];

  const doctorLinks = [
    {
      name: 'Doctor Portal',
      href: '/doctor',
      icon: LayoutDashboard,
    },
  ];

  const patientLinks = [
    {
      name: 'Patient Portal',
      href: '/patient',
      icon: LayoutDashboard,
    },
  ];

  let links: { name: string; href: string; icon: any }[] = [];
  if (role === 'ADMIN') links = adminLinks;
  else if (role === 'DOCTOR') links = doctorLinks;
  else if (role === 'PATIENT') links = patientLinks;

  return (
    <aside className="w-64 border-r bg-white min-h-[calc(100vh-4rem)] flex flex-col p-4 space-y-4">
      <div className="flex-1 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-all duration-200',
                isActive
                  ? 'bg-accentPink text-navyBg rounded-full shadow-sm'
                  : 'text-slate-500 hover:bg-accentPink/15 hover:text-navyBg rounded-full'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </div>
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold px-3 uppercase tracking-wider">
          <HeartPulse className="h-4 w-4 text-rose-400" />
          <span>HealthCare Portal</span>
        </div>
      </div>
    </aside>
  );
}
