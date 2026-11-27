import {
  ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString,
  IsUrl, Min,
} from 'class-validator';

export class CreateMedicineDto {
  @IsString() @IsNotEmpty() brandName: string;
  @IsString() @IsNotEmpty() genericName: string;
  @IsOptional() @IsString() manufacturer?: string;

  @IsIn(['TABLET', 'SYRUP', 'INJECTION', 'DROPS'])
  dosageForm: string;

  @IsString() @IsNotEmpty() strength: string;
  @IsOptional() @IsString() therapeuticClass?: string;

  @IsOptional() @IsBoolean() isAvailable?: boolean;

  @IsOptional() @IsInt() @Min(0) stockQty?: number;
  @IsOptional() @IsInt() @Min(0) threshold?: number;

  @IsOptional() @IsNumber() @Min(0) price?: number;

  @IsOptional() @IsUrl() imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  alternativeIds?: number[];
}