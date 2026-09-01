import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReferralUrgency } from '../../auth/user-role.enum';

export class CreateReferralDto {
  @IsInt()
  patientId: number;

  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsString()
  @IsNotEmpty()
  facilityName: string;

  @IsOptional()
  @IsString()
  facilityType?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsString()
  clinicalSummary?: string;

  @IsEnum(ReferralUrgency)
  urgency: ReferralUrgency;
}
