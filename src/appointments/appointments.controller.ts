import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dtos/create-appointment.dto';
import { UpdateAppointmentDto } from './dtos/update-appointment.dto';

@Controller('appointments')
@UseGuards(JwtGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /** #37 */
  @Post()
  @Roles(UserRole.DOCTOR, UserRole.CHW)
  create(@Body() dto: CreateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.create(dto, req.user.id);
  }

  /** #38 */
  @Get()
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.CHW, UserRole.ADMIN)
  findAll(@Req() req: any, @Query('filter') filter?: 'upcoming' | 'past') {
    return this.appointmentsService.findAllFor(req.user, filter);
  }

  /** #39 */
  @Patch(':id')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentDto, @Req() req: any) {
    return this.appointmentsService.update(id, dto, req.user);
  }
}
