import express, { Router } from 'express';
import { requireSupabaseAuth } from '../auth/supabaseAuthMiddleware';
import { RequestWithUser } from '../auth/types';

export function createProfileRouter(): Router {
  const router = express.Router();

  router.get('/', requireSupabaseAuth, (req, res) => {
    const authReq = req as RequestWithUser;
    res.json({
      id: authReq.user.id,
      email: authReq.user.email,
    });
  });

  return router;
}
