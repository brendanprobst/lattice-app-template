import { Result } from '../../domain/errors/Result';
import { ErrorCatalog } from '../../domain/errors/ErrorCatalog';
import { IThingRepository } from '../../domain/repositories/IThingRepository';
import { ThingDto } from '../dtos/ThingDto';

export class GetThingByIdUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(id: string): Promise<Result<ThingDto>> {
    try {
      const thing = await this.thingRepository.findById(id);
      if (!thing) {
        return Result.failure(
          ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id })
        );
      }
      return Result.success(thing.toPrimitives());
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
