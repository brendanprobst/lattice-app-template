import type { DataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';
import type { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';

type AllowedEmailRow = { email: string };

/**
 * Reads the public.allowed_emails table via PostgREST. Email comparison is
 * case-insensitive in the DB (citext column), but we still lowercase here as a
 * defense-in-depth normalization since URL encoding is plain text.
 */
export class AllowedEmailRepository implements IAllowedEmailRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: DataAdapter) {
    this.table = process.env.ALLOWED_EMAILS_TABLE?.trim() || 'allowed_emails';
  }

  async isAllowed(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    const rows = await this.dataAdapter.get<AllowedEmailRow[]>(
      `${this.table}?select=email&email=eq.${encodeURIComponent(normalized)}&limit=1`,
    );
    return rows.length > 0;
  }
}
