import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsObject, MaxLength } from 'class-validator';

export class UpdateStaffProfileDto {
  @ApiProperty({
    example: 'Senior Hair Stylist',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiProperty({
    example: '10+ years of experience in hair styling and coloring',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiProperty({
    example: {
      monday: { open: '10:00', close: '18:00', closed: false },
      tuesday: { open: '10:00', close: '18:00', closed: false },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customSchedule?: {
    monday?: { open: string; close: string; closed: boolean };
    tuesday?: { open: string; close: string; closed: boolean };
    wednesday?: { open: string; close: string; closed: boolean };
    thursday?: { open: string; close: string; closed: boolean };
    friday?: { open: string; close: string; closed: boolean };
    saturday?: { open: string; close: string; closed: boolean };
    sunday?: { open: string; close: string; closed: boolean };
  };
}
