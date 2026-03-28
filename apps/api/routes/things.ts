import express, { Router } from 'express';
import { ThingController } from '../controllers/ThingController';
import { Container } from '../infrastructure/container';
import { requireSupabaseAuth } from '../auth/supabaseAuthMiddleware';
import '../config/swagger/decorators/things.decorators';

export function createThingRouter(container: Container): Router {
  const router = express.Router();
  const controller = new ThingController(container);
  router.use(requireSupabaseAuth);

  router.get('/', (req, res) => controller.listThings(req, res));
  router.post('/', (req, res) => controller.createThing(req, res));
  router.get('/:id', (req, res) => controller.getThingById(req, res));
  router.put('/:id', (req, res) => controller.updateThing(req, res));
  router.delete('/:id', (req, res) => controller.deleteThing(req, res));

  return router;
}
