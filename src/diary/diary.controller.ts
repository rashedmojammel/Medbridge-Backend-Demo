import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { DiaryService } from './diary.service';
import { CreateDiaryEntryDto } from './dtos/create-diary-entry.dto';

@ApiTags('Health diary')
@ApiBearerAuth('access-token')
@Controller('diary')
@UseGuards(JwtGuard, RolesGuard)
export class DiaryController {
  constructor(private readonly diaryService: DiaryService) {}

  /** Patients record for themselves; a CHW can record on a patient's behalf. */
  @Post()
  @Roles(UserRole.PATIENT, UserRole.CHW)
  create(@Body() dto: CreateDiaryEntryDto, @Req() req: any) {
    return this.diaryService.create(dto, req.user);
  }

  @Get('me')
  @Roles(UserRole.PATIENT)
  findMine(@Req() req: any) {
    return this.diaryService.findMine(req.user);
  }

  @Get('patient/:patientId')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  findForPatient(@Param('patientId', ParseIntPipe) patientId: number) {
    return this.diaryService.findForPatient(patientId);
  }

  /** Pre-consultation glance: mood trend, average pain, adherence rate. */
  @Get('patient/:patientId/summary')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.ADMIN)
  summary(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Query('days') days?: string,
  ) {
    return this.diaryService.summaryForPatient(patientId, days ? Number(days) : 14);
  }

  @Delete(':id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.diaryService.remove(id, req.user);
  }
}
