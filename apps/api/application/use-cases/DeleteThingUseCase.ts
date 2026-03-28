import { Result } from '../../domain/errors/Result';
import { ErrorCatalog } from '../../domain/errors/ErrorCatalog';
import { IThingRepository } from '../../domain/repositories/IThingRepository';

export class DeleteThingUseCase {
  constructor(private thingRepository: IThingRepository) {}

  async execute(id: number): Promise<Result<void>> {
    try {
      const removed = await this.thingRepository.delete(id);
      if (!removed) {
        return Result.failure(
          ErrorCatalog.formatError(ErrorCatalog.THING_NOT_FOUND, { id })
        );
      }
      return Result.success(undefined);
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
