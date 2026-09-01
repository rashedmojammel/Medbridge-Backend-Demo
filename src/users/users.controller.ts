import {
  Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Patch, Post,
  Query, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtGuard } from '../auth/jwtGuard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { UserRole } from '../auth/user-role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---------- Public directory - NO auth (declared before :id routes) ----------

  /** #4 */
  @Get('public/doctors')
  publicDoctors(@Query('search') search?: string, @Query('specialization') spec?: string) {
    return this.usersService.publicDoctors(search, spec);
  }

  /** #5 */
  @Get('public/doctors/:id')
  publicDoctorProfile(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.publicDoctorProfile(id);
  }

  /** #6 */
  @Get('public/chws')
  publicChws(@Query('search') search?: string, @Query('area') area?: string) {
    return this.usersService.publicChws(search, area);
  }

  /** #7 */
  @Get('public/staff')
  publicStaff(@Query('department') department?: string) {
    return this.usersService.publicStaff(department);
  }

  // ---------- Admin ----------

  /** #8 */
  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(role, status, search);
  }

  /** #9 */
  @Get(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  /** #10 */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  /** #11 */
  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  /** #12 - owner or admin; images only; saved to /uploads (tutorial Multer pattern) */
  @Post(':id/photo')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(null, false);
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (req.user.role !== UserRole.ADMIN && req.user.id !== id)
      throw new ForbiddenException('You can only update your own photo');
    if (!file) throw new ForbiddenException('Only image files are allowed');
    return this.usersService.savePhoto(id, file.filename);
  }
}
