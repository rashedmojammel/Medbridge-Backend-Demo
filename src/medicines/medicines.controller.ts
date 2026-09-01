import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dtos/create-medicine.dto';
import { UpdateStockDto } from './dtos/update-stock.dto';

@Controller('medicines')
@UseGuards(JwtGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  // NOTE: static-segment routes MUST be declared before ':id' routes,
  // otherwise 'search'/'low-stock' get captured as an :id parameter.

  /** #31 */
  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.PHARMACIST)
  search(@Query('q') q: string) {
    return this.medicinesService.search(q);
  }

  /** #32 */
  @Get('low-stock')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  lowStock() {
    return this.medicinesService.lowStock();
  }

  /** #33 */
  @Get(':id/alternatives')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.PHARMACIST)
  alternatives(@Param('id', ParseIntPipe) id: number) {
    return this.medicinesService.getAlternatives(id);
  }

  /** #34 */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  create(@Body() dto: CreateMedicineDto) {
    return this.medicinesService.create(dto);
  }

  /** #35 */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateMedicineDto>) {
    return this.medicinesService.update(id, dto);
  }

  /** #36 */
  @Patch(':id/stock')
  @Roles(UserRole.PHARMACIST)
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @Req() req: any,
  ) {
    return this.medicinesService.updateStock(id, dto, req.user.id);
  }
}
