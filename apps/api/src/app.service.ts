import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'zed360-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
