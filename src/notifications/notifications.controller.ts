import { Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwtGuard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** #40 */
  @Get()
  list(@Req() req: any, @Query('unread') unread?: string) {
    return this.notificationsService.listFor(req.user.id, unread === 'true');
  }

  /** #41 */
  @Patch(':id/read')
  markRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notificationsService.markRead(id, req.user.id);
  }

  /** #42 */
  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
