import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'service-id-here' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ example: 'staff-id-here' })
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ example: '2024-12-25T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: 'Please use organic products',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
