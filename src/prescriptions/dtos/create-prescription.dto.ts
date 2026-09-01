import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsInt, IsOptional, IsString, ValidateNested,
} from 'class-validator';

class PrescriptionItemDto {
  @IsInt()
  medicineId: number;

  @IsString()
  dosage: string;

  @IsString()
  frequency: string;

  @IsString()
  duration: string;

  @IsOptional() @IsString() route?: string;
  @IsOptional() @IsString() instructions?: string;
}

export class CreatePrescriptionDto {
  @IsOptional()
  @IsInt()
  consultationId?: number;

  @IsInt()
  patientId: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
