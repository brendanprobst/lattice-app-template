export interface IAllowedEmailRepository {
  isAllowed(email: string): Promise<boolean>;
}
