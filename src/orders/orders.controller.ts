import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { OrderStatus, UserRole } from '../auth/user-role.enum';
// import { CreateOrderDto } from './dtos/create-order.dto';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';

@Controller('orders')
@UseGuards(JwtGuard, RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  create(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.createOrder(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.PATIENT)
  findMine(@Req() req: any) {
    return this.ordersService.findMine(req.user.id);
  }

  @Get('all')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  findAll(@Query('status') status?: OrderStatus) {
    return this.ordersService.findAll(status);
  }

  /** Pharmacist marks a paid order as physically handed over to the patient. */
  @Patch(':id/fulfill')
  @Roles(UserRole.PHARMACIST)
  fulfill(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.ordersService.markFulfilled(id, req.user.id);
  }
}