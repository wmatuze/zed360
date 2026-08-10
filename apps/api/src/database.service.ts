import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createDatabase } from '@zed360/database';
import { loadApiEnvironment } from './environment';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly client;
  readonly db;

  constructor() {
    loadApiEnvironment();
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required to start the API.');
    }

    const database = createDatabase(databaseUrl);
    this.client = database.client;
    this.db = database.db;
  }

  async onModuleDestroy() {
    await this.client.end({ timeout: 5 });
  }
}
