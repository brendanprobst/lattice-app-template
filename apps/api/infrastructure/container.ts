import { IThingRepository } from '@api/domain/repositories/IThingRepository';
import { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';
import { SupabaseAdapter } from '@api/infrastructure/adapters/supabase/SupabaseAdapter';
import { InMemoryThingRepository } from '@api/infrastructure/repositories/InMemoryThingRepository';
import { ThingRepository } from '@api/infrastructure/repositories/ThingRepository';
import { AllowedEmailRepository } from '@api/infrastructure/repositories/AllowedEmailRepository';
import { CreateThingUseCase } from '@api/application/use-cases/CreateThingUseCase';
import { GetThingByIdUseCase } from '@api/application/use-cases/GetThingByIdUseCase';
import { ListThingsUseCase } from '@api/application/use-cases/ListThingsUseCase';
import { UpdateThingUseCase } from '@api/application/use-cases/UpdateThingUseCase';
import { DeleteThingUseCase } from '@api/application/use-cases/DeleteThingUseCase';
import { Logger } from '@api/utils/logger';

function hasSupabaseEnv(): boolean {
  return (
    !!process.env.SUPABASE_URL?.trim() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Service Container - Dependency injection container
 *
 * Scale note: when this file grows past ~8 repository/use-case getters, prefer a
 * dedicated composition module or DI toolkit rather than expanding this class ad hoc.
 * See `apps/api/infrastructure/AGENTS.md`.
 */
export class Container {
  private thingRepository: IThingRepository;
  private allowedEmailRepository?: IAllowedEmailRepository;

  constructor() {
    if (hasSupabaseEnv()) {
      const dataAdapter = new SupabaseAdapter();
      this.thingRepository = new ThingRepository(dataAdapter);
      this.allowedEmailRepository = new AllowedEmailRepository(dataAdapter);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when NODE_ENV=production',
      );
    }

    Logger.warning(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory Thing storage (dev only). Data is lost on restart. Email allowlist requires Supabase. Copy apps/api/.env.example to apps/api/.env for Supabase.',
    );
    this.thingRepository = new InMemoryThingRepository();
  }

  isAllowlistConfigured(): boolean {
    return this.allowedEmailRepository !== undefined;
  }

  getThingRepository() {
    return this.thingRepository;
  }

  getAllowedEmailRepository(): IAllowedEmailRepository {
    if (!this.allowedEmailRepository) {
      throw new Error(
        'Email allowlist requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. In-memory dev mode does not implement allowlist storage.',
      );
    }
    return this.allowedEmailRepository;
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
