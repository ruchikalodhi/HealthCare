import { prisma } from './prisma';
import { redis } from './redis';
import { Role } from '@prisma/client';

export interface GeneratedSlot {
  time: string; // HH:MM format
  dateTime: string; // ISO String in UTC
}

/**
 * Computes available slots for a given doctor on a requested calendar date (YYYY-MM-DD).
 */
export async function generateAvailableSlots(
  doctorId: string,
  dateString: string
): Promise<GeneratedSlot[]> {
  // 1. Load Doctor Profile
  const doctor = await prisma.user.findUnique({
    where: { id: doctorId },
    include: { doctorProfile: true },
  });

  if (!doctor || doctor.role !== Role.DOCTOR || !doctor.doctorProfile) {
    return [];
  }

  const { specialization, workingHoursStart, workingHoursEnd, slotDuration, leaveDays } =
    doctor.doctorProfile;

  // 2. Check if requested date falls under Leave Days
  if (leaveDays.includes(dateString)) {
    return [];
  }

  // 3. Segment shift into potential slot times
  // We represent shifts in UTC to prevent timezone shifts across systems
  const startDateTime = new Date(`${dateString}T${workingHoursStart}:00.000Z`);
  const endDateTime = new Date(`${dateString}T${workingHoursEnd}:00.000Z`);

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    return [];
  }

  const potentialSlots: GeneratedSlot[] = [];
  const slotDurationMs = slotDuration * 60 * 1000;
  let current = startDateTime.getTime();

  while (current + slotDurationMs <= endDateTime.getTime()) {
    const slotDate = new Date(current);
    const hours = String(slotDate.getUTCHours()).padStart(2, '0');
    const minutes = String(slotDate.getUTCMinutes()).padStart(2, '0');

    potentialSlots.push({
      time: `${hours}:${minutes}`,
      dateTime: slotDate.toISOString(),
    });

    current += slotDurationMs;
  }

  // 4. Filter out historical slot times
  const now = Date.now();
  let futureSlots = potentialSlots.filter((slot) => new Date(slot.dateTime).getTime() > now);

  // 5. Query booked appointments from Database
  const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorProfileId: doctor.doctorProfile.id,
      status: {
        in: ['BOOKED', 'SCHEDULED'],
      },
      dateTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      dateTime: true,
    },
  });

  const bookedDateTimes = new Set(
    bookedAppointments.map((appt) => appt.dateTime.toISOString())
  );

  // 6. Query active Redis slot holds
  // Hold key format: slot_hold:{doctorId}:{dateTimeISO}
  const holdPattern = `slot_hold:${doctorId}:*`;
  const holdKeys = await redis.keys(holdPattern);
  const heldDateTimes = new Set<string>();

  for (const key of holdKeys) {
    const holdData = await redis.get(key);
    if (holdData) {
      // Extract the ISO string from key: slot_hold:{doctorId}:{dateTimeISO}
      const parts = key.split(':');
      // Joining back in case ISO string has colons e.g., slot_hold:id:2026-08-25T10:00:00.000Z
      const dateTimePart = parts.slice(2).join(':');
      if (dateTimePart) {
        heldDateTimes.add(new Date(dateTimePart).toISOString());
      }
    }
  }

  // 7. Filter slots
  return futureSlots.filter((slot) => {
    const isoString = new Date(slot.dateTime).toISOString();
    return !bookedDateTimes.has(isoString) && !heldDateTimes.has(isoString);
  });
}
