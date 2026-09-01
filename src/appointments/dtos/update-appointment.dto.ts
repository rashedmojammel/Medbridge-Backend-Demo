import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsIn(['SCHEDULED', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
