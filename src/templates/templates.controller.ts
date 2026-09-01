import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dtos/create-template.dto';

@ApiTags('Prescription templates')
@ApiBearerAuth('access-token')
@Controller('prescription-templates')
@UseGuards(JwtGuard, RolesGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles(UserRole.DOCTOR)
  create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    return this.templatesService.create(dto, req.user.id);
  }

  @Get()
  @Roles(UserRole.DOCTOR)
  findAll(@Req() req: any) {
    return this.templatesService.findAllFor(req.user.id);
  }

  @Get(':id')
  @Roles(UserRole.DOCTOR)
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.templatesService.findOne(id, req.user.id);
  }

  /** Returns a prescription-shaped payload to prefill the form. */
  @Post(':id/apply')
  @Roles(UserRole.DOCTOR)
  apply(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.templatesService.apply(id, req.user.id);
  }

  @Delete(':id')
  @Roles(UserRole.DOCTOR)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.templatesService.remove(id, req.user.id);
  }
}
