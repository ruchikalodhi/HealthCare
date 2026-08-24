import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Read-only, any-authenticated-user doctor directory used by the patient
 * booking flow (and anywhere else that just needs to list/search doctors).
 *
 * This is intentionally a separate route from /api/admin/doctors, which
 * remains admin-only and also exposes create/update mutations. This route
 * never mutates anything and only returns the fields a patient needs to
 * pick a doctor and see their availability window.
 *
 * Supports optional specialization filtering via ?specialization=Cardiology
 * (case-insensitive partial match), matching the brief's requirement that
 * patients can "search doctors by specialisation".
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Any authenticated role (patient/doctor/admin) may read this directory.
    const { searchParams } = new URL(req.url);
    const specialization = searchParams.get('specialization')?.trim();

    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
        ...(specialization
          ? {
              doctorProfile: {
                specialization: {
                  contains: specialization,
                  mode: 'insensitive',
                },
              },
            }
          : {}),
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

    // Doctors without a completed profile aren't bookable yet — exclude them
    // rather than surfacing a doctor card with no specialization/hours.
    const bookableDoctors = doctors.filter((d) => d.doctorProfile !== null);

    // Also return the distinct set of specializations so the frontend can
    // populate a filter dropdown without a second round trip.
    const specializations = Array.from(
      new Set(bookableDoctors.map((d) => d.doctorProfile!.specialization))
    ).sort();

    return NextResponse.json({ doctors: bookableDoctors, specializations });
  } catch (error: any) {
    console.error('Error fetching doctor directory:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
