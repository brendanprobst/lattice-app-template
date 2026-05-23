import type { IAllowedEmailRepository } from '@api/domain/repositories/IAllowedEmailRepository';

/**
 * Test-only allowlist fake (not used in production). Defaults to allow-all until
 * {@link setAllowed} narrows the list for a test case.
 */
export class StubAllowedEmailRepository implements IAllowedEmailRepository {
  private readonly emails = new Set<string>();
  private allowAll = true;

  setAllowed(emails: string[]): void {
    this.allowAll = false;
    this.emails.clear();
    for (const email of emails) {
      this.emails.add(email.trim().toLowerCase());
    }
  }

  async isAllowed(email: string): Promise<boolean> {
    if (this.allowAll) {
      return true;
    }
    return this.emails.has(email.trim().toLowerCase());
  }
}
