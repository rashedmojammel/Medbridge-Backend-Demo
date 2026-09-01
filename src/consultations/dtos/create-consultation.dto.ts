import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateConsultationDto {
  @IsInt()
  patientId: number;

  @IsInt()
  doctorId: number;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
