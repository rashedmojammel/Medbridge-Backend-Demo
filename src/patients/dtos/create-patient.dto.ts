import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  dob: string;

  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsOptional() @IsString() bloodGroup?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional() @IsString() altPhone?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional() @IsString() village?: string;
  @IsOptional() @IsString() district?: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @IsOptional() @IsString() emergencyContactRelation?: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactPhone: string;

  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() chronicConditions?: string;
  @IsOptional() @IsString() currentMedications?: string;
}
