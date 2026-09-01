import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { PrescriptionsService } from './prescriptions.service';
import { DispensingService } from './dispensing.service';
import { DispenseDto } from './dtos/dispense.dto';
import { CreatePrescriptionDto } from './dtos/create-prescription.dto';
import { CreateTreatmentPlanDto } from './dtos/create-treatment-plan.dto';

class CancelPrescriptionDto {
  @IsString() @IsNotEmpty() reason: string;
}

@Controller()
@UseGuards(JwtGuard, RolesGuard)
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService: PrescriptionsService,
    private readonly dispensingService: DispensingService,
  ) {}

  /** #25 */
  @Post('prescriptions')
  @Roles(UserRole.DOCTOR)
  create(@Body() dto: CreatePrescriptionDto, @Req() req: any) {
    return this.prescriptionsService.create(dto, req.user.id);
  }

  /** #26 */
  @Get('prescriptions')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT)
  findAll(@Req() req: any) {
    return this.prescriptionsService.findAllFor(req.user);
  }

  /** #27 */
  @Get('prescriptions/:id')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.prescriptionsService.findOne(id, req.user);
  }

  /** #28 - cancel & reissue is the only "edit" path */
  @Patch('prescriptions/:id/cancel')
  @Roles(UserRole.DOCTOR)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPrescriptionDto,
    @Req() req: any,
  ) {
    return this.prescriptionsService.cancel(id, req.user.id, dto.reason);
  }

  /** #29 */
  @Post('treatment-plans')
  @Roles(UserRole.DOCTOR)
  createPlan(@Body() dto: CreateTreatmentPlanDto, @Req() req: any) {
    return this.prescriptionsService.createPlan(dto, req.user.id);
  }

  /** #30 */
  @Get('treatment-plans/patient/:patientId')
  @Roles(UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN)
  plansForPatient(@Param('patientId', ParseIntPipe) patientId: number, @Req() req: any) {
    return this.prescriptionsService.plansForPatient(patientId, req.user);
  }

  // ---- dispensing (pharmacist) ----

  /** Queue of active prescriptions the pharmacy has not fully released yet. */
  @Get('dispensing/queue')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN)
  pendingQueue() {
    return this.dispensingService.pendingQueue();
  }

  /** What has been handed over so far, and what is still outstanding. */
  @Get('prescriptions/:id/dispense')
  @Roles(UserRole.PHARMACIST, UserRole.ADMIN, UserRole.DOCTOR, UserRole.PATIENT)
  dispenseHistory(@Param('id', ParseIntPipe) id: number) {
    return this.dispensingService.findDispenseHistory(id);
  }

  /** Records the handover and decrements stock in one transaction. */
  @Post('prescriptions/:id/dispense')
  @Roles(UserRole.PHARMACIST)
  dispense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DispenseDto,
    @Req() req: any,
  ) {
    return this.dispensingService.dispense(id, dto, req.user);
  }
}
