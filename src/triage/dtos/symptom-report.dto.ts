import {
  ArrayNotEmpty, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
} from 'class-validator';
import { TriageStatus } from '../../auth/user-role.enum';

export class SymptomReportDto {
  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  vitalSignId?: number;

  @IsString()
  @IsNotEmpty()
  primaryComplaint: string;

  @IsArray()
  @ArrayNotEmpty()
  symptoms: string[];

  @IsOptional() @IsString() duration?: string;

  @IsIn(['MILD', 'MODERATE', 'SEVERE'])
  severity: string;

  @IsEnum(TriageStatus)
  triageStatus: TriageStatus;

  @IsOptional() @IsString() notes?: string;
}
