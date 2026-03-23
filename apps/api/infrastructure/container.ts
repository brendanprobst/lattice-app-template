import { IThingRepository } from '../domain/repositories/IThingRepository';
import { SupabaseAdapter } from './adapters/supabase/SupabaseAdapter';
import { ThingRepository } from './repositories/ThingRepository';
import { CreateThingUseCase } from '../application/use-cases/CreateThingUseCase';
import { GetThingByIdUseCase } from '../application/use-cases/GetThingByIdUseCase';
import { ListThingsUseCase } from '../application/use-cases/ListThingsUseCase';
import { UpdateThingUseCase } from '../application/use-cases/UpdateThingUseCase';
import { DeleteThingUseCase } from '../application/use-cases/DeleteThingUseCase';

/**
 * Service Container - Dependency injection container
 */
export class Container {
  private thingRepository: IThingRepository;

  constructor() {
    const supabaseAdapter = new SupabaseAdapter();
    this.thingRepository = new ThingRepository(supabaseAdapter);
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
