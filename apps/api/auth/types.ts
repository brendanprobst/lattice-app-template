import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
