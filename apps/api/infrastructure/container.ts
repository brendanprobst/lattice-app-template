import { IThingRepository } from '../domain/repositories/IThingRepository';
import { SupabaseAdapter } from './adapters/supabase/SupabaseAdapter';
import { InMemoryThingRepository } from './repositories/InMemoryThingRepository';
import { ThingRepository } from './repositories/ThingRepository';
import { CreateThingUseCase } from '../application/use-cases/CreateThingUseCase';
import { GetThingByIdUseCase } from '../application/use-cases/GetThingByIdUseCase';
import { ListThingsUseCase } from '../application/use-cases/ListThingsUseCase';
import { UpdateThingUseCase } from '../application/use-cases/UpdateThingUseCase';
import { DeleteThingUseCase } from '../application/use-cases/DeleteThingUseCase';
import { Logger } from '../utils/logger';

function hasSupabaseEnv(): boolean {
  return (
    !!process.env.SUPABASE_URL?.trim() &&
    !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

/**
 * Service Container - Dependency injection container
 */
export class Container {
  private thingRepository: IThingRepository;

  constructor() {
    if (hasSupabaseEnv()) {
      const supabaseAdapter = new SupabaseAdapter();
      this.thingRepository = new ThingRepository(supabaseAdapter);
      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when NODE_ENV=production',
      );
    }

    Logger.warning(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using in-memory Thing storage (dev only). Data is lost on restart. Copy apps/api/.env.example to apps/api/.env for Supabase.',
    );
    this.thingRepository = new InMemoryThingRepository();
  }

  getThingRepository() {
    return this.thingRepository;
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
