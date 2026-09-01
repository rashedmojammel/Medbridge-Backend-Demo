import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

class SlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(HHMM, { message: 'startTime must be HH:mm' })
  startTime: string;

  @Matches(HHMM, { message: 'endTime must be HH:mm' })
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  slotMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => SlotDto)
  slots: SlotDto[];
}

export class TimeOffDto {
  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
