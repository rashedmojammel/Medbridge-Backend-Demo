import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class RecordVitalsDto {
  @IsInt()
  patientId: number;

  @IsNumber()
  @Min(30)
  @Max(45)
  temperature: number;

  @IsInt() @Min(50) @Max(260)
  bpSystolic: number;

  @IsInt() @Min(30) @Max(200)
  bpDiastolic: number;

  @IsInt() @Min(20) @Max(250)
  pulse: number;

  @IsInt() @Min(0) @Max(100)
  spo2: number;

  @IsOptional() @IsInt() @Min(5) @Max(80)
  respiratoryRate?: number;

  @IsOptional() @IsNumber() @Min(20) @Max(800)
  bloodSugar?: number;
}
