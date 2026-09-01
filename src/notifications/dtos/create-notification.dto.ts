import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../../auth/user-role.enum';

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() body: string;

  @IsOptional() @IsInt() refId?: number;
}
