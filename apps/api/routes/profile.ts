import express, { Router } from 'express';
import { Container } from '@api/infrastructure/container';
import { RequestWithUser } from '@api/auth/types';

export function createProfileRouter(_container: Container): Router {
  const router = express.Router();

  router.get('/', (req, res) => {
    const authReq = req as RequestWithUser;
    res.json({
      id: authReq.user.id,
      email: authReq.user.email,
    });
  });

  return router;
}
