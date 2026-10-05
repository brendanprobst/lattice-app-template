import express, { Router, type RequestHandler } from 'express';
import { UserController } from '@api/controllers/UserController';
import { Container } from '@api/infrastructure/container';

export type UserRouterDeps = {
  requireAuth: RequestHandler[];
  /** Optional: attach so GET returns the owner DTO when the caller is the subject. */
  optionalAuth?: RequestHandler;
};

/** GET/PUT `/users/:id` only. Do not replace kernel `GET /profile` (JWT claims). */
export function createUserRouter(
  container: Container,
  deps: UserRouterDeps
): Router {
  const router = express.Router({ mergeParams: true });
  const controller = new UserController(container);
  const { requireAuth, optionalAuth } = deps;

  if (optionalAuth) {
    router.get('/:id', optionalAuth, (req, res) => controller.getUser(req, res));
  } else {
    router.get('/:id', (req, res) => controller.getUser(req, res));
  }
  router.put('/:id', ...requireAuth, (req, res) => controller.updateUser(req, res));

  return router;
}
