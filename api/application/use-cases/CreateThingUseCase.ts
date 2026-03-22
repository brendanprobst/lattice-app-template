import { randomUUID } from 'crypto';
import { Result } from '../../domain/errors/Result';
import { ErrorCatalog } from '../../domain/errors/ErrorCatalog';
import { Thing } from '../../domain/entities/Thing';
import { IThingRepository } from '../../domain/repositories/IThingRepository';
import { ThingDto } from '../dtos/ThingDto';

export class CreateThingUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(name: string): Promise<Result<ThingDto>> {
    const trimmed = name?.trim() ?? '';
    if (!trimmed) {
      return Result.failure(ErrorCatalog.THING_NAME_INVALID);
    }

    try {
      const thing = new Thing(`thing-${randomUUID()}`, trimmed, new Date());
      await this.thingRepository.save(thing);
      return Result.success(thing.toPrimitives());
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
