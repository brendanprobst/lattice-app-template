/**
 * Test setup - Creates isolated test app instances
 */
import { createApp } from '../apps/api/app';
import { Container } from '../apps/api/infrastructure/container';
import { loadSeedData } from '../apps/api/infrastructure/seed';

export function createTestApp() {
  const container = new Container();
  loadSeedData(container.getThingRepository());
  return createApp(container);
}
