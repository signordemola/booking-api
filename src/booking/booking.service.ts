import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { BookingStatus } from 'generated/prisma/enums';
import { Prisma, Staff } from 'generated/prisma/client';

@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // CUSTOMER METHODS
  // ============================================

  async create(customerId: string, dto: CreateBookingDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        business: {
          select: {
            id: true,
            timezone: true,
            businessHours: true,
          },
        },
        staff: {
          where: { id: dto.staffId },
          select: {
            id: true,
            isActive: true,
            customSchedule: true,
          },
        },
      },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException('Service not found or inactive!');
    }

    const staff: Staff = service.staff?.[0];

    if (!staff) {
      throw new BadRequestException(
        'Staff member not found or not assigned to this service!',
      );
    }

    if (!staff.isActive) {
      throw new BadRequestException('Staff member is not active!');
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(
      startTime.getTime() + service.durationMins * 60000,
    );

    if (startTime <= new Date()) {
      throw new BadRequestException('Booking time must be in the future!');
    }

    // Check for conflicting bookings
    const conflictingBooking = await this.prisma.booking.findFirst({
      where: {
        staffId: dto.staffId,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      throw new ConflictException(
        'This time slot is already booked. Please choose another time!',
      );
    }

    return await this.prisma.booking.create({
      data: {
        customerId,
        serviceId: dto.serviceId,
        staffId: dto.staffId,
        businessId: service.business.id,
        startTime,
        endTime,
        customerNotes: dto.customerNotes,
        status: BookingStatus.PENDING,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
            currency: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
    });
  }

  async findAllCustomer(customerId: string, query: QueryBookingDto) {
    const where: Prisma.BookingWhereInput = {
      customerId,
      ...(query.status && { status: query.status }),
      ...(query.startDate &&
        query.endDate && {
          startTime: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    return await this.prisma.booking.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
            currency: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneCustomer(customerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            durationMins: true,
            price: true,
            currency: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
        business: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            phoneNumber: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    return booking;
  }

  async updateCustomer(
    customerId: string,
    bookingId: string,
    dto: UpdateBookingDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
      include: {
        service: {
          select: { durationMins: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Only pending bookings can be updated by customers!',
      );
    }

    const updateData: Prisma.BookingUpdateInput = {};

    if (dto.startTime) {
      const newStartTime = new Date(dto.startTime);
      if (newStartTime <= new Date()) {
        throw new BadRequestException('Booking time must be in the future!');
      }

      const newEndTime = new Date(
        newStartTime.getTime() + booking.service.durationMins * 60000,
      );

      // Check conflicts
      const conflict = await this.prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          staffId: booking.staffId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          OR: [
            {
              AND: [
                { startTime: { lte: newStartTime } },
                { endTime: { gt: newStartTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: newEndTime } },
                { endTime: { gte: newEndTime } },
              ],
            },
          ],
        },
      });

      if (conflict) {
        throw new ConflictException('This time slot is already booked!');
      }

      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
    }

    if (dto.customerNotes !== undefined) {
      updateData.customerNotes = dto.customerNotes;
    }

    return await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        service: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  async cancelCustomer(
    customerId: string,
    bookingId: string,
    dto: CancelBookingDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot cancel a ${booking.status.toLowerCase()} booking!`,
      );
    }

    return await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: dto.cancellationReason,
        cancelledAt: new Date(),
      },
    });
  }

  // ============================================
  // BUSINESS OWNER METHODS
  // ============================================

  async findAllOwner(ownerId: string, query: QueryBookingDto) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId },
      select: { id: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found!');
    }

    const where: Prisma.BookingWhereInput = {
      businessId: business.id,
      ...(query.status && { status: query.status }),
      ...(query.startDate &&
        query.endDate && {
          startTime: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    return await this.prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
            currency: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneOwner(ownerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        business: { ownerId },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        service: true,
        staff: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    return booking;
  }

  async updateStatusOwner(
    ownerId: string,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        business: { ownerId },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    const updateData: Prisma.BookingUpdateInput = {
      status: dto.status,
      staffNotes: dto.staffNotes,
    };

    if (dto.status === BookingStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (dto.status === BookingStatus.COMPLETED) {
      updateData.completedAt = new Date();
    } else if (dto.status === BookingStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    return await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
      },
    });
  }

  // ============================================
  // STAFF METHODS
  // ============================================

  async findAllStaff(userId: string, query: QueryBookingDto) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const where: Prisma.BookingWhereInput = {
      staffId: staff.id,
      ...(query.status && { status: query.status }),
      ...(query.startDate &&
        query.endDate && {
          startTime: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        }),
    };

    return await this.prisma.booking.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            price: true,
            currency: true,
          },
        },
        business: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async findOneStaff(userId: string, bookingId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        staffId: staff.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        service: true,
        business: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        payment: {
          select: {
            amount: true,
            status: true,
            paidAt: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    return booking;
  }

  async updateStatusStaff(
    userId: string,
    bookingId: string,
    dto: UpdateBookingStatusDto,
  ) {
    const staff = await this.prisma.staff.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundException('Staff profile not found!');
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        staffId: staff.id,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found!');
    }

    const updateData: Prisma.BookingUpdateInput = {
      status: dto.status,
      staffNotes: dto.staffNotes,
    };

    if (dto.status === BookingStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (dto.status === BookingStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return await this.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        service: true,
      },
    });
  }
}
