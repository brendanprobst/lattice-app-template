import { Result } from '../../domain/errors/Result';
import { ErrorCatalog } from '../../domain/errors/ErrorCatalog';
import { IThingRepository } from '../../domain/repositories/IThingRepository';
import { ThingDto } from '../dtos/ThingDto';

export class ListThingsUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(): Promise<Result<ThingDto[]>> {
    try {
      const things = await this.thingRepository.findAll();
      return Result.success(things.map((t) => t.toPrimitives()));
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
