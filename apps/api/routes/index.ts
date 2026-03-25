import express, { Request, Response, NextFunction } from 'express';
import '../config/swagger/decorators/index.decorators';

const router = express.Router();

router.get('/', function(_req: Request, res: Response, _next: NextFunction) {
  res.json({
    message: 'Lattice API',
    version: '1.0.0'
  });
});

export default router;
