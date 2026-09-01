import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { app: 'Medbridge API', status: 'running', time: new Date().toISOString() };
  }
}
