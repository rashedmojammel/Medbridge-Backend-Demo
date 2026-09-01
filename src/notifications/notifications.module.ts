import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from '../users/users.entity';
import { Notifications } from './notifications.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notifications, Users])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService], // MUST be exported - triage/prescriptions/medicines/appointments/consultations depend on it
})
export class NotificationsModule {}
