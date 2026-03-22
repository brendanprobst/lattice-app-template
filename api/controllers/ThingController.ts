import { Request, Response } from 'express';
import { Container } from '../infrastructure/container';
import { ResponseHandler } from '../utils/responseHandler';

/**
 * HTTP adapter for Thing CRUD (template vertical slice).
 */
export class ThingController {
  constructor(private container: Container) {}

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
      const result = await this.container.getCreateThingUseCase().execute(name);
      if (result.isFailure()) {
        ResponseHandler.handleResult(result, res);
        return;
      }
      res.status(201).json(result.getValue());
    } catch (error) {
      ResponseHandler.handleError(error, res);
    }
  }

  async getThingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
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
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
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
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        res.status(400).json({
          error: { status: 400, message: 'id is required' },
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
