import { Result } from '../../domain/errors/Result';
import { ErrorCatalog } from '../../domain/errors/ErrorCatalog';
import { IThingRepository } from '../../domain/repositories/IThingRepository';
import { ThingDto } from '../dtos/ThingDto';

export class UpdateThingUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(id: string, name: string): Promise<Result<ThingDto>> {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      return Result.failure(ErrorCatalog.THING_NAME_INVALID);
    }

    try {
      const thing = await this.thingRepository.findById(id);
      if (!thing) {
        return Result.failure(
          ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id })
        );
      }
      thing.updateName(trimmed);
      await this.thingRepository.save(thing);
      return Result.success(thing.toPrimitives());
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
