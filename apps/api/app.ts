import createError from 'http-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger/index';
import indexRouter from './routes/index';
import { createThingRouter } from './routes/things';
import { createProfileRouter } from './routes/profile';
import { Container } from './infrastructure/container';
import { Logger } from './utils/logger';

/**
 * Creates an Express app instance with the given container
 * If no container is provided, creates a new one and loads seed data
 */
export function createApp(container?: Container): Express {
  const appContainer = container || new Container();

  const app = express();
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lattice API · Documentation',
  }));

  app.use('/', indexRouter);
  app.use('/profile', createProfileRouter());
  app.use('/me', createProfileRouter());
  app.use('/things', createThingRouter(appContainer));

  app.use(function(_req: Request, _res: Response, next: NextFunction) {
    next(createError(404));
  });

  app.use(function(err: any, req: Request, res: Response, _next: NextFunction) {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const stack = typeof err?.stack === 'string' ? err.stack : undefined;

    Logger.error(`[api] ${req.method} ${req.originalUrl} -> ${status} ${message}`);
    if (req.app.get('env') === 'development' && stack) {
      Logger.error(stack);
    }

    res.status(status).json({
      error: {
        status,
        message,
        ...(req.app.get('env') === 'development' && { stack: err.stack })
      }
    });
  });

  return app;
}

const app = createApp();
export default app;
