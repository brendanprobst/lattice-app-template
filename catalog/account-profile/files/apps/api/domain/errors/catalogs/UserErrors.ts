import { ResultError } from '@api/domain/errors/ResultError';

export class UserErrors {
  static readonly NOT_FOUND = ResultError.create(
    'USER_NOT_FOUND',
    "We couldn't find that profile."
  );

  static readonly FORBIDDEN = ResultError.create(
    'USER_FORBIDDEN',
    'You can only update your own profile.'
  );

  static readonly INVALID_INPUT = ResultError.create(
    'USER_INVALID_INPUT',
    'Please provide a valid profile update.'
  );

  static readonly HANDLE_INVALID = ResultError.create(
    'HANDLE_INVALID',
    'Handles must be 3–30 characters: start and end with a letter or number, and use only lowercase letters, numbers, underscores, or hyphens.'
  );

  static readonly HANDLE_BLOCKLISTED = ResultError.create(
    'HANDLE_BLOCKLISTED',
    'That handle is reserved.'
  );

  static readonly HANDLE_TAKEN = ResultError.create(
    'HANDLE_TAKEN',
    'That handle is already taken.'
  );
}
