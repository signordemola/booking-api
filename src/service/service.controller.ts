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
import { ServiceService } from './service.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'generated/prisma/enums';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtUser } from 'src/types';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('Service')
@Controller('service')
export class ServiceController {
  constructor(private readonly service: ServiceService) {}

  @ApiOperation({
    summary: 'Create new service',
    description:
      'Create a new service offering for the business. Requires BUSINESS_OWNER role. Service includes name, description, duration, price, and staff assignments.',
  })
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateServiceDto) {
    const service = await this.service.create(user.id, dto);
    return {
      message: 'Service created successfully',
      service,
    };
  }

  @ApiOperation({
    summary: 'Get all services (Public)',
    description:
      'Retrieve list of all active services. Public endpoint. Can optionally filter by businessId or staffId query parameters.',
  })
  @Get('all')
  async findAll(
    @Query('businessId') businessId?: string,
    @Query('staffId') staffId?: string,
  ) {
    return await this.service.findAll(businessId, staffId);
  }

  @ApiOperation({
    summary: 'Get services by business (Public)',
    description:
      'Retrieve all active services offered by a specific business. Public endpoint accessible without authentication.',
  })
  @Get('business/:businessId')
  async findByBusiness(@Param('businessId') businessId: string) {
    return await this.service.findByBusiness(businessId);
  }

  @ApiOperation({
    summary: 'Get services by staff member (Public)',
    description:
      'Retrieve all services that a specific staff member can provide. Public endpoint.',
  })
  @Get('staff/:staffId')
  async findByStaff(@Param('staffId') staffId: string) {
    return await this.service.findByStaff(staffId);
  }

  @ApiOperation({
    summary: 'Get service details (Public)',
    description:
      'Retrieve detailed information about a specific service including pricing, duration, description, and available staff.',
  })
  @Get(':id')
  @ApiOperation({ summary: 'Get service details (public)' })
  async findOne(@Param('id') id: string) {
    return await this.service.findOne(id);
  }

  @ApiOperation({
    summary: 'Update service',
    description:
      'Update service details including name, description, price, duration, and staff assignments. Requires BUSINESS_OWNER role.',
  })
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Update service' })
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    const service = await this.service.update(user.id, id, dto);
    return {
      message: 'Service updated successfully',
      service,
    };
  }

  @ApiOperation({
    summary: 'Toggle service active status',
    description:
      "Activate or deactivate a service. Deactivated services won't be available for new bookings. Requires BUSINESS_OWNER role.",
  })
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Toggle service active status' })
  async toggleActive(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const service = await this.service.toggleActive(user.id, id);
    return {
      message: 'Service status updated',
      service,
    };
  }

  @ApiOperation({
    summary: 'Delete service',
    description:
      'Permanently delete a service. This action cannot be undone. Requires BUSINESS_OWNER role.',
  })
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUSINESS_OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete service' })
  async remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return await this.service.remove(user.id, id);
  }
}
