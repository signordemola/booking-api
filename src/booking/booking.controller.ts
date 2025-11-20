// src/booking/booking.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtUser } from 'src/types';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';

@ApiTags('Booking')
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ============================================
  // CUSTOMER ENDPOINTS
  // ============================================

  @ApiTags('Customer -> Booking')
  @ApiOperation({
    summary: 'Create new booking (Customer)',
    description:
      'Customer creates a new booking for a service with a specific staff member. Validates time slot availability and business hours.',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateBookingDto) {
    const booking = await this.bookingService.create(user.id, dto);
    return {
      message: 'Booking created successfully!',
      booking,
    };
  }

  @ApiOperation({
    summary: 'Get my bookings (Customer)',
    description:
      'Retrieve all bookings made by the authenticated customer. Supports filtering by status and date range.',
  })
  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async getMyBookings(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryBookingDto,
  ) {
    return await this.bookingService.findAllCustomer(user.id, query);
  }

  @ApiOperation({
    summary: 'Get booking details (Customer)',
    description:
      'Retrieve detailed information about a specific booking including service, staff, and payment details.',
  })
  @Get('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async getMyBooking(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return await this.bookingService.findOneCustomer(user.id, id);
  }

  @ApiOperation({
    summary: 'Update booking (Customer)',
    description:
      'Customer can update their pending booking. Only start time and customer notes can be modified.',
  })
  @Patch('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  async updateMyBooking(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const booking = await this.bookingService.updateCustomer(user.id, id, dto);
    return {
      message: 'Booking updated successfully!',
      booking,
    };
  }

  @ApiOperation({
    summary: 'Cancel booking (Customer)',
    description:
      'Customer can cancel their pending or confirmed booking. Cannot cancel completed bookings.',
  })
  @Delete('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async cancelMyBooking(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    const booking = await this.bookingService.cancelCustomer(user.id, id, dto);
    return {
      message: 'Booking cancelled successfully!',
      booking,
    };
  }

  // ============================================
  // BUSINESS OWNER ENDPOINTS
  // ============================================

  @ApiTags('Owner -> Booking')
  @ApiOperation({
    summary: 'Get all business bookings (Owner)',
    description:
      'Business owner retrieves all bookings for their business. Supports filtering by status and date range.',
  })
  @Get('owner/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getAllBookingsOwner(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryBookingDto,
  ) {
    return await this.bookingService.findAllOwner(user.id, query);
  }

  @ApiOperation({
    summary: 'Get booking details (Owner)',
    description:
      'Business owner retrieves detailed information about a specific booking in their business.',
  })
  @Get('owner/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getBookingOwner(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return await this.bookingService.findOneOwner(user.id, id);
  }

  @ApiOperation({
    summary: 'Update booking status (Owner)',
    description:
      'Business owner can update booking status (confirm, complete, cancel, mark as no-show) and add staff notes.',
  })
  @Patch('owner/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async updateBookingStatusOwner(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.bookingService.updateStatusOwner(
      user.id,
      id,
      dto,
    );
    return {
      message: 'Booking status updated successfully!',
      booking,
    };
  }

  // ============================================
  // STAFF ENDPOINTS
  // ============================================

  @ApiTags('Staff -> Booking')
  @ApiOperation({
    summary: 'Get my assigned bookings (Staff)',
    description:
      'Staff member retrieves all bookings assigned to them. Supports filtering by status and date range.',
  })
  @Get('staff/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF)
  async getMyBookingsStaff(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryBookingDto,
  ) {
    return await this.bookingService.findAllStaff(user.id, query);
  }

  @ApiOperation({
    summary: 'Get booking details (Staff)',
    description:
      'Staff member retrieves detailed information about a specific booking assigned to them.',
  })
  @Get('staff/my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF)
  async getMyBookingStaff(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    return await this.bookingService.findOneStaff(user.id, id);
  }

  @ApiOperation({
    summary: 'Update booking status (Staff)',
    description:
      'Staff member can update their assigned booking status (confirm, complete) and add notes.',
  })
  @Patch('staff/my/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STAFF)
  async updateBookingStatusStaff(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    const booking = await this.bookingService.updateStatusStaff(
      user.id,
      id,
      dto,
    );
    return {
      message: 'Booking status updated successfully!',
      booking,
    };
  }
}
