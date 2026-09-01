import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DiaryMood } from '../../auth/user-role.enum';

export class CreateDiaryEntryDto {
  @IsOptional()
  @IsInt()
  patientId?: number; // CHW supplies this; a patient does not

  @IsString()
  @IsNotEmpty()
  note: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symptoms?: string[];

  @IsEnum(DiaryMood)
  mood: DiaryMood;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painLevel?: number;

  @IsOptional()
  @IsBoolean()
  medicationTaken?: boolean;
}
