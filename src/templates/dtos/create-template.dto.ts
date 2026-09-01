import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class TemplateItemDto {
  @IsInt()
  medicineId: number;

  @IsString() @IsNotEmpty() dosage: string;
  @IsString() @IsNotEmpty() frequency: string;
  @IsString() @IsNotEmpty() duration: string;

  @IsOptional() @IsString() route?: string;
  @IsOptional() @IsString() instructions?: string;
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional() @IsString() condition?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isShared?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TemplateItemDto)
  items: TemplateItemDto[];
}
