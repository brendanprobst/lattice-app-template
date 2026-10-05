import type { User } from '@api/domain/entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** Active users only (`deleted_at` is null). Handle must already be lowercase. */
  findByHandle(handle: string): Promise<User | null>;
  /**
   * True when any row — including soft-deleted — already owns this handle.
   */
  isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean>;
  save(user: User): Promise<void>;
}
