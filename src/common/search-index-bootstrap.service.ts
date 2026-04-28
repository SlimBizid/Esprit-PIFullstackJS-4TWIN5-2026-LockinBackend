import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SearchIndexBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchIndexBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.dataSource.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_challenges_title_trgm
        ON challenges
        USING gin (title gin_trgm_ops)
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_users_username_trgm
        ON users
        USING gin (username gin_trgm_ops)
      `);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';

      this.logger.warn(
        `Search indexes were not initialized automatically: ${message}`,
      );
    }
  }
}
