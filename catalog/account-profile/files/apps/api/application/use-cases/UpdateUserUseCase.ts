import type { SocialLink, UserOwnerDto } from '@api/domain/entities/User';
import { Result } from '@api/domain/errors/Result';
import { ErrorCatalog } from '@api/domain/errors/ErrorCatalog';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import { UserHandle } from '@api/domain/value-objects/UserHandle';

export type UpdateUserInput = {
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  zipCode?: string | null;
  socialLinks?: SocialLink[] | null;
  handle?: string | null;
};

export class UpdateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(
    actorId: string,
    targetId: string,
    input: UpdateUserInput
  ): Promise<Result<UserOwnerDto>> {
    try {
      const user = await this.userRepository.findById(targetId);
      if (!user) {
        return Result.failure(ErrorCatalog.USER_NOT_FOUND);
      }
      if (actorId !== user.id) {
        return Result.failure(ErrorCatalog.USER_FORBIDDEN);
      }

      const { handle: nextHandle, ...profileInput } = input;

      if (nextHandle !== undefined) {
        if (nextHandle === null || nextHandle.trim() === '') {
          user.applyProfileUpdate({ handle: null });
        } else {
          const parsed = UserHandle.parse(nextHandle);
          if (!parsed.ok) {
            return Result.failure(
              parsed.reason === 'blocklisted'
                ? ErrorCatalog.HANDLE_BLOCKLISTED
                : ErrorCatalog.HANDLE_INVALID
            );
          }
          const taken = await this.userRepository.isHandleTaken(
            parsed.handle.value,
            user.id
          );
          if (taken) {
            return Result.failure(ErrorCatalog.HANDLE_TAKEN);
          }
          user.applyProfileUpdate({ handle: parsed.handle.value });
        }
      }

      const previousZip = user.zipCode;
      user.applyProfileUpdate(profileInput);

      if (input.zipCode !== undefined) {
        const nextZip = input.zipCode?.trim() || null;
        if (!nextZip || nextZip !== previousZip) {
          user.clearGeo();
        }
      }

      await this.userRepository.save(user);
      return Result.success(user.toOwnerDto());
    } catch {
      return Result.failure(ErrorCatalog.INTERNAL_SERVER_ERROR);
    }
  }
}
