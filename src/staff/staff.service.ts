import { Injectable, NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { QueryStaffStatsDto } from './dto/query-staff-stats.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStaff(userId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { userId } });
    if (!staff) throw new NotFoundException('Staff profile not found!');
    return staff;
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  async getMyProfile(userWhereUniqueInput: Prisma.StaffWhereUniqueInput) {
    const staff = await this.prisma.staff.findUnique({
      where: userWhereUniqueInput,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            image: true,
            role: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phoneNumber: true,
            businessHours: true,
            timezone: true,
          },
        },
        _count: {
          select: {
            services: true,
            bookings: true,
          },
        },
      },
    });

    console.log('Staff: ', staff);

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    return staff;
  }

  async updateMyProfile(
    where: Prisma.StaffWhereUniqueInput,
    data: UpdateStaffProfileDto,
  ) {
    const staff = await this.prisma.staff.findUnique({
      where,
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    return await this.prisma.staff.update({
      where,
      data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // ============================================
  // SERVICES MANAGEMENT
  // ============================================

  async getMyServices(userWhereUniqueInput: Prisma.StaffWhereUniqueInput) {
    const staff = await this.prisma.staff.findUnique({
      where: userWhereUniqueInput,
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    return await this.prisma.service.findMany({
      where: { staffId: staff.id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { name: 'desc' },
    });
  }

  // ============================================
  // SCHEDULE & AVAILABILITY
  // ============================================

  async getMySchedule(userId: string, query: QueryStaffStatsDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true, customSchedule: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const startDate = query.startDate ? new Date(query.startDate) : new Date();
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const bookings = await this.prisma.booking.findMany({
      where: {
        staffId: staff.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      customSchedule: staff.customSchedule,
      bookings,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  async getMyStats(userId: string, query: QueryStaffStatsDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const dateFilter = {
      ...(query.startDate &&
        query.endDate && {
          startTime: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    const [
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { staffId: staff.id, ...dateFilter },
      }),
      this.prisma.booking.count({
        where: {
          staffId: staff.id,
          status: BookingStatus.COMPLETED,
          ...dateFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          staffId: staff.id,
          status: BookingStatus.CANCELLED,
          ...dateFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          staffId: staff.id,
          status: BookingStatus.PENDING,
          ...dateFilter,
        },
      }),
      this.prisma.booking.count({
        where: {
          staffId: staff.id,
          status: BookingStatus.CONFIRMED,
          ...dateFilter,
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          booking: {
            staffId: staff.id,
            status: BookingStatus.COMPLETED,
            ...dateFilter,
          },
          status: 'PAID',
        },
      }),
    ]);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      pendingBookings,
      confirmedBookings,
      totalRevenue: Number(totalRevenue._sum.amount || 0),
      completionRate:
        totalBookings > 0
          ? ((completedBookings / totalBookings) * 100).toFixed(2)
          : '0.00',
    };
  }

  async getUpcomingBookings(userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    return await this.prisma.booking.findMany({
      where: {
        staffId: staff.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: { gte: new Date() },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    });
  }

  async getTodayBookings(userId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return await this.prisma.booking.findMany({
      where: {
        staffId: staff.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
          },
        },
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }
}
