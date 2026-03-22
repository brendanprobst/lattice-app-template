import * as fs from 'fs';
import * as path from 'path';
import { InMemoryThingRepository } from './repositories/InMemoryThingRepository';

/**
 * Optional bootstrap: load seed JSON into in-memory repositories.
 *
 * For richer startup strategies (DB migrations, multi-repo seeds), see project notes on bootstrap.
 */
export function loadSeedData(thingRepository: InMemoryThingRepository): void {
  try {
    const possiblePaths = [
      path.join(__dirname, '../../../seed.json'),
      path.join(__dirname, '../../seed.json'),
      path.join(process.cwd(), 'seed.json'),
    ];

    let seedPath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        seedPath = possiblePath;
        break;
      }
    }

    if (!seedPath) {
      throw new Error(`Seed file not found. Tried: ${possiblePaths.join(', ')}`);
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as {
      things?: Array<{ id: string; name: string; createdAt: string }>;
    };

    const things = seedData.things ?? [];
    thingRepository.initialize(things);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to load seed data: ${errorMessage}`);
  }
}
