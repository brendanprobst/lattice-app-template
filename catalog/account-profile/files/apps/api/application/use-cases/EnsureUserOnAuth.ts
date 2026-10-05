import { User } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';

/**
 * Creates a `users` row whose `id` is the JWT `sub` when the row is missing.
 * Call after a successful sign-in (or on first `GET /users/:id` for the actor).
 * A Supabase `auth.users` trigger that inserts `(id, email)` is an equivalent.
 */
export class EnsureUserOnAuth {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(actor: { id: string; email: string | null }): Promise<User> {
    const existing = await this.userRepository.findById(actor.id);
    if (existing) {
      return existing;
    }

    const user = new User({
      id: actor.id,
      email: actor.email ?? '',
      handle: null,
      displayName: null,
      avatarUrl: null,
      bio: null,
      zipCode: null,
      city: null,
      state: null,
      lat: null,
      lng: null,
      socialLinks: [],
      createdAt: new Date(),
      deletedAt: null,
    });
    await this.userRepository.save(user);
    return user;
  }
}
