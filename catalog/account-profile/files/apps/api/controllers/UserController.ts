import { Request, Response } from 'express';
import type { UpdateUserInput } from '@api/application/use-cases/UpdateUserUseCase';
import type { RequestWithUser } from '@api/auth/types';
import type { SocialLink } from '@api/domain/entities/User';
import { Container } from '@api/infrastructure/container';
import { ResponseHandler } from '@api/utils/responseHandler';

function isSocialLinks(value: unknown): value is SocialLink[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as SocialLink).label === 'string' &&
      typeof (item as SocialLink).url === 'string'
  );
}

export class UserController {
  constructor(private readonly container: Container) {}

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const actorId = (req as RequestWithUser).user?.id ?? null;
      const result = await this.container
        .getGetUserUseCase()
        .execute(id, actorId);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id ?? '');
      if (!id) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
        });
        return;
      }
      const actorId = (req as RequestWithUser).user.id;
      const body = req.body ?? {};
      if (body.socialLinks !== undefined && !isSocialLinks(body.socialLinks) && body.socialLinks !== null) {
        res.status(400).json({
          error: {
            status: 400,
            message: 'socialLinks must be an array of { label, url }',
          },
        });
        return;
      }
      if (
        'handle' in body &&
        body.handle !== null &&
        typeof body.handle !== 'string'
      ) {
        res.status(400).json({
          error: {
            status: 400,
            code: 'USER_INVALID_INPUT',
            message: 'handle must be a string or null',
          },
        });
        return;
      }

      const input: UpdateUserInput = {};
      if ('displayName' in body) input.displayName = body.displayName;
      if ('avatarUrl' in body) input.avatarUrl = body.avatarUrl;
      if ('bio' in body) input.bio = body.bio;
      if ('zipCode' in body) input.zipCode = body.zipCode;
      if ('socialLinks' in body) input.socialLinks = body.socialLinks;
      if ('handle' in body) input.handle = body.handle;

      const result = await this.container
        .getUpdateUserUseCase()
        .execute(actorId, id, input);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
