import { IsDateString, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTreatmentPlanDto {
  @IsInt()
  patientId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  details: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
