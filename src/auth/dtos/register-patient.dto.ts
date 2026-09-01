import {
  IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength,
} from 'class-validator';

export class RegisterPatientDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsDateString()
  dob: string;

  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactName: string;

  @IsString()
  @IsNotEmpty()
  emergencyContactPhone: string;

  @IsString()
  @MinLength(6)
  password: string;
}
