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
  UseGuards,
} from '@nestjs/common';
import { BusinessService } from './business.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtUser } from 'src/types';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { UpdateStaffByOwnerDto } from './dto/update-staff.dto';

@ApiTags('Business')
@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @ApiOperation({
    summary: 'Get my business profile',
    description:
      "Retrieve authenticated business owner's business details including settings and configuration.",
  })
  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getMyBusiness(@CurrentUser() user: JwtUser) {
    const business = await this.businessService.myBusiness(user.id);
    return {
      business,
    };
  }

  @ApiOperation({
    summary: 'Get business analytics overview',
    description:
      'Get comprehensive analytics including total bookings, revenue, active services, and staff count.',
  })
  @Get('stats/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getOverviewStats(@CurrentUser() user: JwtUser) {
    return await this.businessService.overviewStats(user.id);
  }

  @ApiOperation({
    summary: 'Get booking statistics',
    description:
      'Get booking status breakdown (pending, confirmed, completed, cancelled).',
  })
  @Get('stats/bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getBookingStats(@CurrentUser() user: JwtUser) {
    return await this.businessService.bookingStats(user.id);
  }

  @ApiOperation({
    summary: 'Get revenue statistics',
    description:
      'Get revenue data including monthly, weekly, and daily breakdowns.',
  })
  @Get('stats/revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getRevenueStats(@CurrentUser() user: JwtUser) {
    return await this.businessService.revenueStats(user.id);
  }

  @ApiOperation({
    summary: 'Get staff statistics',
    description: 'Get staff performance metrics and statistics.',
  })
  @Get('stats/staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getStaffStats(@CurrentUser() user: JwtUser) {
    return await this.businessService.staffStats(user.id);
  }

  @ApiOperation({
    summary: 'Get service statistics',
    description: 'Get service popularity and performance metrics.',
  })
  @Get('stats/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getServiceStats(@CurrentUser() user: JwtUser) {
    return await this.businessService.serviceStats(user.id);
  }

  @ApiOperation({
    summary: 'Create business profile (one-time)',
    description:
      'Create business profile. Each business owner can only create one business. This is a one-time operation.',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async createBusiness(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateBusinessDto,
  ) {
    const business = await this.businessService.create(user.id, dto);
    return {
      message: 'Business created successfully!',
      business,
    };
  }

  @ApiOperation({
    summary: 'Update business details',
    description:
      'Update business profile information including name, description, contact info, and settings.',
  })
  @Patch('edit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @HttpCode(HttpStatus.OK)
  async updateBusiness(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateBusinessDto,
  ) {
    const business = await this.businessService.update(user.id, dto);
    return {
      message: 'Business updated successfully!',
      business,
    };
  }

  // ============================================
  // STAFF ENDPOINTS
  // ============================================
  @ApiTags('Owner -> Staff')
  @ApiOperation({
    summary: 'Get all staff members',
    description:
      'Retrieve list of all staff members belonging to the business including their details and status.',
  })
  @Get('/staffs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async getAllStaffs(@CurrentUser() user: JwtUser) {
    return await this.businessService.allStaffs(user.id);
  }

  @ApiOperation({
    summary: 'Invite staff member',
    description:
      'Send invitation to a user to join as staff member. User must already be registered.',
  })
  @Post('staff/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async inviteStaff(@CurrentUser() user: JwtUser, @Body() dto: InviteStaffDto) {
    const staff = await this.businessService.inviteStaff(user.id, dto);
    return { message: 'Staff invited successfully!', staff };
  }

  @ApiOperation({
    summary: 'Update staff member details',
    description:
      'Update staff member information including specialization, commission rate, and active status.',
  })
  @Patch('staff/:staffId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  async updateStaff(
    @CurrentUser() user: JwtUser,
    @Param('staffId') staffId: string,
    @Body() dto: UpdateStaffByOwnerDto,
  ) {
    const staff = await this.businessService.updateStaffByOwner(
      user.id,
      staffId,
      dto,
    );
    return { message: 'Staff updated successfully!', staff };
  }

  @ApiOperation({
    summary: 'Remove staff member',
    description:
      'Remove staff member from the business. This will deactivate their access and mark them as inactive.',
  })
  @Delete('staff/:staffId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Remove staff member' })
  async removeStaff(
    @CurrentUser() user: JwtUser,
    @Param('staffId') staffId: string,
  ) {
    return this.businessService.removeStaff(user.id, staffId);
  }
}
