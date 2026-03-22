/**
 * Test setup - Creates isolated test app instances
 */
import { createApp } from '../api/app';
import { Container } from '../api/infrastructure/container';
import { loadSeedData } from '../api/infrastructure/seed';

export function createTestApp() {
  const container = new Container();
  loadSeedData(container.getThingRepository());
  return createApp(container);
}
