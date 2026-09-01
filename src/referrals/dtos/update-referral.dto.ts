import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReferralStatus } from '../../auth/user-role.enum';

export class UpdateReferralDto {
  @IsOptional()
  @IsEnum(ReferralStatus)
  status?: ReferralStatus;

  @IsOptional()
  @IsString()
  outcome?: string;
}
