import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from 'generated/prisma/enums';

export class QueryBookingDto {
  @ApiProperty({ enum: BookingStatus, required: false })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ example: '2024-01-01', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
