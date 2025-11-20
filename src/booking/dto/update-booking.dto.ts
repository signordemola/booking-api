import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateBookingDto {
  @ApiProperty({ example: '2024-12-25T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({
    example: 'Updated notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
