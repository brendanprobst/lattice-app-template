/**
 * Test setup - Creates isolated test app instances
 */
import { Container } from '@api/infrastructure/container';
import { CreateThingUseCase } from '@api/application/use-cases/CreateThingUseCase';
import { DeleteThingUseCase } from '@api/application/use-cases/DeleteThingUseCase';
import { GetThingByIdUseCase } from '@api/application/use-cases/GetThingByIdUseCase';
import { ListThingsUseCase } from '@api/application/use-cases/ListThingsUseCase';
import { UpdateThingUseCase } from '@api/application/use-cases/UpdateThingUseCase';
import { InMemoryThingRepository } from '@api/infrastructure/repositories/InMemoryThingRepository';
import { StubAllowedEmailRepository } from './support/StubAllowedEmailRepository';
import { resetProtectedMiddlewareStackForTests } from '@api/auth/createProtectedMiddlewareStack';

class TestContainer {
  private thingRepository = new InMemoryThingRepository();
  private allowedEmailRepository = new StubAllowedEmailRepository();

  getThingRepository() {
    return this.thingRepository;
  }

  getAllowedEmailRepository() {
    return this.allowedEmailRepository;
  }

  isAllowlistConfigured(): boolean {
    return true;
  }

  getCreateThingUseCase() {
    return new CreateThingUseCase(this.thingRepository);
  }

  getGetThingByIdUseCase() {
    return new GetThingByIdUseCase(this.thingRepository);
  }

  getListThingsUseCase() {
    return new ListThingsUseCase(this.thingRepository);
  }

  getUpdateThingUseCase() {
    return new UpdateThingUseCase(this.thingRepository);
  }

  getDeleteThingUseCase() {
    return new DeleteThingUseCase(this.thingRepository);
  }
}

function applyTestEnvDefaults(): void {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
  process.env.SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret';
  process.env.SUPABASE_JWT_ISSUER = process.env.SUPABASE_JWT_ISSUER || 'https://test-project.supabase.co/auth/v1';
  process.env.SUPABASE_JWT_AUDIENCE = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
}

export function createTestApp() {
  applyTestEnvDefaults();
  resetProtectedMiddlewareStackForTests();
  const { createApp } = require('@api/app') as typeof import('@api/app');
  return createApp(new TestContainer() as unknown as Container);
}

/**
 * Exposes the test container for allowlist and other integration scenarios.
 */
export function createTestAppWithContainer(): { app: ReturnType<typeof createTestApp>; container: TestContainer } {
  applyTestEnvDefaults();
  resetProtectedMiddlewareStackForTests();
  const { createApp } = require('@api/app') as typeof import('@api/app');
  const container = new TestContainer();
  const app = createApp(container as unknown as Container);
  return { app, container };
}
