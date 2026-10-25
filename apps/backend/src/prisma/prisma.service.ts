import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { seedDatabase } from '../../prisma/seed';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.autoSeedIfEmpty();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async autoSeedIfEmpty() {
    try {
      const userCount = await this.user.count();
      if (userCount === 0) {
        this.logger.log('🌱 Database is empty. Auto-provisioning demo accounts...');
        await seedDatabase(this, false);
        this.logger.log('✅ Demo accounts and initial workspace ready!');
      }
    } catch (error) {
      this.logger.warn(`Auto-seeding check skipped: ${error.message}`);
    }
  }
}
