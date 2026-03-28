import { Request, Response } from 'express';
import { Container } from '../infrastructure/container';
import { ResponseHandler } from '../utils/responseHandler';
import { Logger } from '../utils/logger';

/**
 * HTTP adapter for Thing CRUD (template vertical slice).
 */
export class ThingController {
  constructor(private container: Container) {}
  private parseThingId(rawId: unknown): number | null {
    if (!rawId || Array.isArray(rawId)) {
      return null;
    }
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  async listThings(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.container.getListThingsUseCase().execute();
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async createThing(req: Request, res: Response): Promise<void> {
    try {
      const name = req.body?.name;
      if (typeof name !== 'string') {
        res.status(400).json({
          error: { status: 400, message: 'name is required and must be a string' },
        });
        return;
      }

      Logger.info(
        `[things:create] incoming request (nameLength=${name.trim().length} table=${process.env.SUPABASE_THINGS_TABLE?.trim() || 'things'})`,
      );

      const result = await this.container.getCreateThingUseCase().execute(name);
      if (result.isFailure()) {
        const resultError = result.getError();
        Logger.warning(
          `[things:create] domain validation failure (code=${resultError.code} message=${resultError.message})`,
        );
        ResponseHandler.handleResult(result, res);
        return;
      }

      const created = result.getValue();
      Logger.success(`[things:create] success (id=${created.id})`);

      res.status(201).json(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.error(`[things:create] unexpected failure (${message})`);
      ResponseHandler.handleError(error, res);
    }
  }

  async getThingById(req: Request, res: Response): Promise<void> {
    try {
      const id = this.parseThingId(req.params.id);
      if (id === null) {
        res.status(400).json({
          error: { status: 400, message: 'id is required and must be a positive integer' },
        });
        return;
      }
      const result = await this.container.getGetThingByIdUseCase().execute(id);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async updateThing(req: Request, res: Response): Promise<void> {
    try {
      const id = this.parseThingId(req.params.id);
      if (id === null) {
        res.status(400).json({
          error: { status: 400, message: 'id is required and must be a positive integer' },
        });
        return;
      }
      const name = req.body?.name;
      if (typeof name !== 'string') {
        res.status(400).json({
          error: { status: 400, message: 'name is required and must be a string' },
        });
        return;
      }
      const result = await this.container.getUpdateThingUseCase().execute(id, name);
      ResponseHandler.handleResult(result, res);
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async deleteThing(req: Request, res: Response): Promise<void> {
    try {
      const id = this.parseThingId(req.params.id);
      if (id === null) {
        res.status(400).json({
          error: { status: 400, message: 'id is required and must be a positive integer' },
        });
        return;
      }
      const result = await this.container.getDeleteThingUseCase().execute(id);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(204).send();
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }
}
