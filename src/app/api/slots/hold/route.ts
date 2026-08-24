import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const HOLD_TTL_SECONDS = 300; // 5 minutes hold window

// POST: Acquire/renew a slot hold
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.PATIENT) {
      return NextResponse.json({ error: 'Unauthorized. Patient account required.' }, { status: 401 });
    }

    const { doctorId, dateTime } = await req.json();

    if (!doctorId || !dateTime) {
      return NextResponse.json({ error: 'doctorId and dateTime are required' }, { status: 400 });
    }

    const parsedDateTime = new Date(dateTime);
    if (isNaN(parsedDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid dateTime format' }, { status: 400 });
    }

    // 1. Check if doctor exists and has a profile
    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
      include: { doctorProfile: true },
    });

    if (!doctor || doctor.role !== Role.DOCTOR || !doctor.doctorProfile) {
      return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
    }

    // 2. Check if already booked in PostgreSQL
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorProfileId: doctor.doctorProfile.id,
        dateTime: parsedDateTime,
        status: {
          in: ['BOOKED', 'SCHEDULED'],
        },
      },
    });

    if (existingAppointment) {
      return NextResponse.json(
        { error: 'This time slot is already booked' },
        { status: 409 }
      );
    }

    // 3. Atomically try to acquire the hold with SET NX EX. This is the
    // fix for the check-then-write race: previously we did a `get` and
    // then a separate `set`, which let two concurrent requests both see
    // "no hold" before either wrote one. SET ... NX is a single atomic
    // Redis command, so only one caller can ever win the acquisition.
    const holdKey = `slot_hold:${doctorId}:${parsedDateTime.toISOString()}`;
    const holdValue = JSON.stringify({
      patientId: session.user.id,
      timestamp: Date.now(),
    });

    const acquired = await redis.set(holdKey, holdValue, 'EX', HOLD_TTL_SECONDS, 'NX');

    if (acquired !== 'OK') {
      // Someone already holds this slot (or it's our own hold and we want
      // to renew it) - find out which before deciding how to respond.
      const existingHold = await redis.get(holdKey);
      const holdData = existingHold ? JSON.parse(existingHold) : null;

      if (!holdData) {
        // Extremely rare: the hold expired between the failed NX and this
        // read. Retry once, atomically.
        const retryAcquired = await redis.set(holdKey, holdValue, 'EX', HOLD_TTL_SECONDS, 'NX');
        if (retryAcquired !== 'OK') {
          return NextResponse.json(
            { error: 'This slot is temporarily held by another patient' },
            { status: 409 }
          );
        }
      } else if (holdData.patientId !== session.user.id) {
        return NextResponse.json(
          { error: 'This slot is temporarily held by another patient' },
          { status: 409 }
        );
      } else {
        // Same patient renewing their own hold - safe to overwrite since
        // only this patient can legitimately hold this key.
        await redis.set(holdKey, holdValue, 'EX', HOLD_TTL_SECONDS);
      }
    }

    return NextResponse.json(
      {
        message: 'Slot hold acquired successfully',
        expiresAt: new Date(Date.now() + HOLD_TTL_SECONDS * 1000).toISOString(),
        ttl: HOLD_TTL_SECONDS,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error holding slot:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Release a slot hold
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.PATIENT) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { doctorId, dateTime } = await req.json();

    if (!doctorId || !dateTime) {
      return NextResponse.json({ error: 'doctorId and dateTime are required' }, { status: 400 });
    }

    const parsedDateTime = new Date(dateTime);
    if (isNaN(parsedDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid dateTime format' }, { status: 400 });
    }

    const holdKey = `slot_hold:${doctorId}:${parsedDateTime.toISOString()}`;
    const holdData = await redis.get(holdKey);

    if (holdData) {
      const parsedHold = JSON.parse(holdData);
      if (parsedHold.patientId === session.user.id) {
        await redis.del(holdKey);
        return NextResponse.json({ message: 'Slot hold released successfully' });
      }
      return NextResponse.json(
        { error: 'Cannot release a hold owned by another patient' },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: 'No active hold found for this slot' });
  } catch (error: any) {
    console.error('Error releasing hold:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
