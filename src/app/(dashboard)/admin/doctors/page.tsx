import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import DoctorListTable from './DoctorListTable';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const revalidate = 0; // Ensure lists are always fetched dynamically

export default async function AdminDoctorsPage() {
  // Query all doctor accounts including their profile configs
  const doctors = await prisma.user.findMany({
    where: {
      role: Role.DOCTOR,
    },
    select: {
      id: true,
      name: true,
      email: true,
      doctorProfile: {
        select: {
          id: true,
          specialization: true,
          workingHoursStart: true,
          workingHoursEnd: true,
          slotDuration: true,
          leaveDays: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navyBg uppercase tracking-tight">Manage Doctor Profiles</h1>
          <p className="text-slate-500 font-medium">Configure shifts, appointment slots, and update leave day settings.</p>
        </div>
        <Link href="/admin/doctors/create">
          <Button className="bg-navyBg hover:bg-navyBg/90 text-white font-bold rounded-full flex items-center gap-1.5 shrink-0 text-xs py-2 px-5 shadow-sm">
            <Plus className="h-4 w-4" /> Onboard Doctor
          </Button>
        </Link>
      </div>

      <DoctorListTable initialDoctors={doctors} />
    </div>
  );
}
