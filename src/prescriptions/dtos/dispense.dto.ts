import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class DispenseItemDto {
  @IsInt()
  medicineId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class DispenseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DispenseItemDto)
  items: DispenseItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
