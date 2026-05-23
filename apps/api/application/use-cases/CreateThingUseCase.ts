import { randomInt } from 'crypto';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { Thing } from '@api/domain/entities/Thing';
import { IThingRepository } from '@api/domain/repositories/IThingRepository';
import { ThingDto } from '@api/application/dtos/ThingDto';

export class CreateThingUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(name: string): Promise<Result<ThingDto>> {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      return Result.failure(ErrorCatalog.THING_NAME_INVALID);
    }

    try {
      const thing = new Thing(randomInt(1_000_000, 2_147_483_647), trimmed, new Date());
      await this.thingRepository.save(thing);
      return Result.success(thing.toPrimitives());
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
