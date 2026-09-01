import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dtos/create-patient.dto';
import { UpdatePatientDto } from './dtos/update-patient.dto';

@Controller('patients')
@UseGuards(JwtGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /** #13 */
  @Post()
  @Roles(UserRole.CHW)
  create(@Body() dto: CreatePatientDto, @Req() req: any) {
    return this.patientsService.create(dto, req.user.id);
  }

  /** #14 */
  @Get()
  @Roles(UserRole.CHW, UserRole.DOCTOR, UserRole.ADMIN)
  findAll(@Query('search') search?: string) {
    return this.patientsService.findAll(search);
  }

  /** #15 - patient may fetch ONLY their own record (checked in service) */
  @Get(':id')
  @Roles(UserRole.CHW, UserRole.DOCTOR, UserRole.ADMIN, UserRole.PATIENT)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.patientsService.findOne(id, req.user);
  }

  /** #16 */
  @Patch(':id')
  @Roles(UserRole.CHW, UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }
}
