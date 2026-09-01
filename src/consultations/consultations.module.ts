import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Patients } from '../patients/patients.entity';
import { Users } from '../users/users.entity';
import { ChatGateway } from './chat.gateway';
import { ChatMessages } from './chat-messages.entity';
import { Consultations } from './consultations.entity';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Consultations, ChatMessages, Patients, Users]),
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, ChatGateway],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
