import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsNotEmpty, IsPositive, ValidateNested } from 'class-validator';

class OrderItemDto {
  @IsInt()
  medicineId: number;

  @IsInt()
  @IsPositive()
  quantity: number;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @ArrayMinSize(1)
  items: OrderItemDto[];
}