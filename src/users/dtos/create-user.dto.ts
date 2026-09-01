import {
  IsBoolean, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MinLength,
} from 'class-validator';
import { UserRole } from '../../auth/user-role.enum';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  // Doctor fields
  @IsOptional() @IsString() specialization?: string;
  @IsOptional() @IsString() qualifications?: string;
  @IsOptional() @IsInt() experienceYears?: number;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() bio?: string;

  // CHW fields
  @IsOptional() @IsString() assignedArea?: string;

  // Staff / Pharmacist fields
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() designation?: string;
}
