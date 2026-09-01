import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaveDiagnosisDto {
  @IsString()
  @IsNotEmpty()
  diagnosis: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
