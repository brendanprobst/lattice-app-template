import createError from 'http-errors';
import express, { Express, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger/index';
import indexRouter from './routes/index';
import { createThingRouter } from './routes/things';
import { Container } from './infrastructure/container';
import { loadSeedData } from './infrastructure/seed';

/**
 * Creates an Express app instance with the given container
 * If no container is provided, creates a new one and loads seed data
 */
export function createApp(container?: Container): Express {
  const appContainer = container || new Container();

  if (!container) {
    try {
      loadSeedData(appContainer.getThingRepository());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to initialize application: ${errorMessage}`);
      throw error;
    }
  }

  const app = express();

  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DDD API Template Documentation',
  }));

  app.use('/', indexRouter);
  app.use('/things', createThingRouter(appContainer));

  app.use(function(_req: Request, _res: Response, next: NextFunction) {
    next(createError(404));
  });

  app.use(function(err: any, req: Request, res: Response, _next: NextFunction) {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

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
