import { User, type SocialLink } from '@api/domain/entities/User';
import type { IUserRepository } from '@api/domain/repositories/IUserRepository';
import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

type UserRecord = {
  id: string;
  email: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  social_links: SocialLink[] | null;
  created_at: string;
  deleted_at: string | null;
};

const USER_SELECT =
  'id,email,handle,display_name,avatar_url,bio,zip_code,city,state,lat,lng,social_links,created_at,deleted_at';

function toUser(row: UserRecord): User {
  return new User({
    id: row.id,
    email: row.email,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    zipCode: row.zip_code,
    city: row.city,
    state: row.state,
    lat: row.lat,
    lng: row.lng,
    socialLinks: Array.isArray(row.social_links) ? row.social_links : [],
    createdAt: new Date(row.created_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
  });
}

export class UserRepository implements IUserRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.SUPABASE_USERS_TABLE?.trim() || 'users';
  }

  async findById(id: string): Promise<User | null> {
    const rows = await this.dataAdapter.get<UserRecord[]>(
      `${this.table}?select=${USER_SELECT}&id=eq.${encodeURIComponent(id)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async findByHandle(handle: string): Promise<User | null> {
    const rows = await this.dataAdapter.get<UserRecord[]>(
      `${this.table}?select=${USER_SELECT}&handle=eq.${encodeURIComponent(handle)}&deleted_at=is.null&limit=1`
    );
    const row = rows[0];
    return row ? toUser(row) : null;
  }

  async isHandleTaken(handle: string, exceptUserId?: string): Promise<boolean> {
    let path = `${this.table}?select=id&handle=eq.${encodeURIComponent(handle)}&limit=1`;
    if (exceptUserId) {
      path += `&id=neq.${encodeURIComponent(exceptUserId)}`;
    }
    const rows = await this.dataAdapter.get<Array<{ id: string }>>(path);
    return rows.length > 0;
  }

  async save(user: User): Promise<void> {
    const row = user.toPersistence();
    await this.dataAdapter.post(
      `${this.table}?on_conflict=id`,
      [row],
      {
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
      }
    );
  }
}
