import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VisitOutcome } from '../../auth/user-role.enum';

export class CreateVisitDto {
  @IsInt()
  patientId: number;

  @IsDateString()
  visitDate: string;

  @IsEnum(VisitOutcome)
  outcome: VisitOutcome;

  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() village?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  travelMinutes?: number;

  @IsOptional()
  @IsBoolean()
  followUpNeeded?: boolean;
}
