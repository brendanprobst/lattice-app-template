import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { IThingRepository } from '@api/domain/repositories/IThingRepository';
import { ThingDto } from '@api/application/dtos/ThingDto';

export class GetThingByIdUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(id: number): Promise<Result<ThingDto>> {
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
