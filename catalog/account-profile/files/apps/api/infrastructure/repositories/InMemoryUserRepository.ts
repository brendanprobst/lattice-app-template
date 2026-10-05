import { User } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  seed(user: User): void {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id) ?? null;
    if (!user || user.deletedAt) return null;
    return user;
  }

  async findByHandle(handle: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.deletedAt) continue;
      if (user.handle === handle) return user;
    }
    return null;
  }

  async isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.handle !== handle) continue;
      if (exceptUserId && user.id === exceptUserId) continue;
      return true;
    }
    return false;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }
}
