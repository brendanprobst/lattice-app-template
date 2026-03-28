import { Thing } from '../../domain/entities/Thing';
import { IThingRepository } from '../../domain/repositories/IThingRepository';

/**
 * In-memory Thing persistence for local dev and tests.
 */
export class InMemoryThingRepository implements IThingRepository {
  private things = new Map<number, Thing>();

  async findById(id: number): Promise<Thing | null> {
    return this.things.get(id) ?? null;
  }

  async findAll(): Promise<Thing[]> {
    return Array.from(this.things.values());
  }

  async save(thing: Thing): Promise<void> {
    this.things.set(thing.id, thing);
  }

  async delete(id: number): Promise<boolean> {
    return this.things.delete(id);
  }

  /**
   * Replace store from seed data (ids must be unique).
   */
  initialize(seedThings: Array<{ id: number; name: string; createdAt: string }>): void {
    this.things.clear();
    for (const row of seedThings) {
      const thing = new Thing(row.id, row.name.trim(), new Date(row.createdAt));
      this.things.set(thing.id, thing);
    }
  }
}
