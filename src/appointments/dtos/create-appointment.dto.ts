import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  patientId: number;

  @IsInt()
  doctorId: number;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsString()
  type?: string;
}
