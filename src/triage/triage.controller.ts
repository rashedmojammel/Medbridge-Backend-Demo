import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { TriageService } from './triage.service';
import { RecordVitalsDto } from './dtos/record-vitals.dto';
import { SymptomReportDto } from './dtos/symptom-report.dto';

@Controller('triage')
@UseGuards(JwtGuard, RolesGuard)
export class TriageController {
  constructor(private readonly triageService: TriageService) {}

  /** #17 */
  @Post('vitals')
  @Roles(UserRole.CHW)
  recordVitals(@Body() dto: RecordVitalsDto, @Req() req: any) {
    return this.triageService.recordVitals(dto, req.user.id);
  }

  /** #18 - CRITICAL fires emergency alerts in the same transaction */
  @Post('symptoms')
  @Roles(UserRole.CHW)
  submitSymptoms(@Body() dto: SymptomReportDto, @Req() req: any) {
    return this.triageService.submitSymptomReport(dto, req.user.id);
  }

  /** #19 */
  @Get('patient/:patientId')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  history(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.triageService.patientHistory(patientId);
  }
}
