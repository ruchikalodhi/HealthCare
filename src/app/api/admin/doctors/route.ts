import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createDoctorSchema } from '@/lib/validations';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const doctors = await prisma.user.findMany({
      where: {
        role: Role.DOCTOR,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
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

    return NextResponse.json(doctors);
  } catch (error: any) {
    console.error('Error fetching doctors:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const body = await req.json();
    const result = createDoctorSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 });
    }

    const { email, password, name, specialization, workingHoursStart, workingHoursEnd, slotDuration, leaveDays } = result.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User and DoctorProfile nested transaction
    const newDoctor = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialization,
            workingHoursStart,
            workingHoursEnd,
            slotDuration,
            leaveDays,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
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
    });

    return NextResponse.json({ message: 'Doctor created successfully', doctor: newDoctor }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating doctor:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
