import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';
import { generateAvailableSlots } from '@/lib/slots';

export const dynamic = 'force-dynamic';

// GET /api/slots?doctorId=...&date=YYYY-MM-DD
// Returns the real, live-computed set of bookable slots for a doctor on a
// given calendar date: their configured working hours, minus leave days,
// minus slots already booked in Postgres, minus slots currently held in
// Redis by another patient mid-checkout.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.PATIENT) {
      return NextResponse.json({ error: 'Unauthorized. Patient account required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const date = searchParams.get('date');

    if (!doctorId || !date) {
      return NextResponse.json({ error: 'doctorId and date are required' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
    }

    const slots = await generateAvailableSlots(doctorId, date);

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Error computing available slots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
