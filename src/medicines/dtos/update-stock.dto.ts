import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { StockAction } from '../../auth/user-role.enum';

export class UpdateStockDto {
  @IsIn(Object.values(StockAction))
  action: StockAction;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
