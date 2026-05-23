import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import { IThingRepository } from '@api/domain/repositories/IThingRepository';
import { ThingDto } from '@api/application/dtos/ThingDto';

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
