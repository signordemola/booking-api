import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma/enums';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtUser } from 'src/types';
import { UpdateStaffProfileDto } from './dto/update-staff-profile.dto';
import { QueryStaffStatsDto } from './dto/query-staff-stats.dto';

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STAFF)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @ApiOperation({
    summary: 'Get my staff profile',
    description:
      'Retrieve authenticated staff member profile including personal info, business details, and statistics.',
  })
  @Get('profile')
  async getMyProfile(@CurrentUser() user: JwtUser) {
    console.log('user: ', user);
    return await this.staffService.getMyProfile({ userId: user.id });
  }

  @ApiOperation({
    summary: 'Update my staff profile',
    description:
      'Update staff profile information including position, bio, and custom schedule.',
  })
  @Patch('profile')
  async updateMyProfile(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    const staff = await this.staffService.updateMyProfile(
      { userId: user.id },
      dto,
    );
    return {
      message: 'Profile updated successfully!',
      staff,
    };
  }

  @ApiOperation({
    summary: 'Get my assigned services',
    description:
      'Retrieve all services that the staff member is assigned to provide.',
  })
  @Get('services')
  async getMyServices(@CurrentUser() user: JwtUser) {
    return await this.staffService.getMyServices({ userId: user.id });
  }

  // ============================================
  // SCHEDULE & AVAILABILITY
  // ============================================

  @ApiOperation({
    summary: 'Get my schedule',
    description:
      'Retrieve staff schedule including custom working hours and upcoming bookings within date range.',
  })
  @Get('schedule')
  async getMySchedule(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryStaffStatsDto,
  ) {
    return await this.staffService.getMySchedule(user.id, query);
  }

  @ApiOperation({
    summary: 'Get today bookings',
    description: 'Retrieve all bookings scheduled for today.',
  })
  @Get('bookings/today')
  async getTodayBookings(@CurrentUser() user: JwtUser) {
    return await this.staffService.getTodayBookings(user.id);
  }

  @ApiOperation({
    summary: 'Get upcoming bookings',
    description:
      'Retrieve upcoming confirmed and pending bookings (next 10 bookings).',
  })
  @Get('bookings/upcoming')
  async getUpcomingBookings(@CurrentUser() user: JwtUser) {
    return await this.staffService.getUpcomingBookings(user.id);
  }

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  @ApiOperation({
    summary: 'Get my statistics',
    description:
      'Retrieve staff performance statistics including total bookings, completion rate, and revenue. Supports date range filtering.',
  })
  @Get('stats')
  async getMyStats(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryStaffStatsDto,
  ) {
    return await this.staffService.getMyStats(user.id, query);
  }
}
