import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ConsultationStatus, UserRole } from '../auth/user-role.enum';
import { ChatGateway } from './chat.gateway';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dtos/create-consultation.dto';
import { SaveDiagnosisDto } from './dtos/save-diagnosis.dto';

@Controller('consultations')
@UseGuards(JwtGuard, RolesGuard)
export class ConsultationsController {
  constructor(
    private readonly consultationsService: ConsultationsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** #20 */
  @Post()
  @Roles(UserRole.CHW)
  create(@Body() dto: CreateConsultationDto, @Req() req: any) {
    return this.consultationsService.create(dto, req.user.id);
  }

  /** #21 */
  @Get()
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.ADMIN)
  findAll(@Req() req: any, @Query('status') status?: ConsultationStatus) {
    return this.consultationsService.findAllFor(req.user, status);
  }

  /** #22 - includes full chat transcript */
  @Get(':id')
  @Roles(UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.consultationsService.findOne(id, req.user);
  }

  /** #23 */
  @Patch(':id/diagnosis')
  @Roles(UserRole.DOCTOR)
  saveDiagnosis(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveDiagnosisDto,
    @Req() req: any,
  ) {
    return this.consultationsService.saveDiagnosis(id, req.user.id, dto);
  }

  /** #24 - locks the chat and tells connected clients */
  @Patch(':id/complete')
  @Roles(UserRole.DOCTOR)
  async complete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const result = await this.consultationsService.complete(id, req.user.id);
    this.chatGateway.notifyEnded(id);
    return result;
  }
}
