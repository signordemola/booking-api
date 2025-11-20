import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from 'generated/prisma/enums';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiProperty({ example: 'Staff notes here', required: false })
  @IsOptional()
  @IsString()
  staffNotes?: string;
}
