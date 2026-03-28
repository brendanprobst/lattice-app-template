import { Thing } from '../entities/Thing';

/**
 * Port for persisting Things (replace with DB adapter in real deployments).
 */
export interface IThingRepository {
  findById(id: number): Promise<Thing | null>;
  findAll(): Promise<Thing[]>;
  save(thing: Thing): Promise<void>;
  delete(id: number): Promise<boolean>;
}
