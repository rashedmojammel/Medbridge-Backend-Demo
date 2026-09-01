import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  consultationId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
