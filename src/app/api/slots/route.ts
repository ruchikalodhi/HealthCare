import { NextRequest, NextResponse } from 'next/server';
import { generateAvailableSlots } from '@/lib/slots';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('doctorId');
    const date = searchParams.get('date'); // YYYY-MM-DD format

    if (!doctorId || !date) {
      return NextResponse.json(
        { error: 'doctorId and date parameters are required' },
        { status: 400 }
      );
    }

    // Basic date validation check
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const slots = await generateAvailableSlots(doctorId, date);
    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
