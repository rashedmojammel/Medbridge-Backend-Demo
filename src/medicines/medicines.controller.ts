import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto } from './dtos/create-medicine.dto';
import { UpdateStockDto } from './dtos/update-stock.dto';
import { CatalogueQueryDto } from './dtos/catalogue-query.dto';

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

  /**
   * Uploads a medicine photo to ImgBB and returns its public URL.
   * Files are held in memory only for the length of the request - nothing
   * is written to this server's disk.
   */
  @Post('image')
  @Roles(UserRole.ADMIN, UserRole.PHARMACIST)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG or WebP images are allowed');
    }

    const key = process.env.IMGBB_API_KEY;
    if (!key) throw new BadRequestException('Image hosting is not configured');

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image: file.buffer.toString('base64') }),
    });
    const data: any = await res.json().catch(() => null);
    const url = data?.data?.url;
    if (!res.ok || !url) throw new BadRequestException('Image upload failed');

    return { url: url as string };
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

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.CHW, UserRole.PATIENT, UserRole.PHARMACIST)
  catalogue(@Query() query: CatalogueQueryDto) {
    return this.medicinesService.catalogue(query);
  }
}