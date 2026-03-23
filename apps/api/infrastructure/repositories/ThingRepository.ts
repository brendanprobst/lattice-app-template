import { Thing } from '../../domain/entities/Thing';
import { IThingRepository } from '../../domain/repositories/IThingRepository';
import { ThingDataAdapter, ThingRecord } from '../adapters/ThingDataAdapter';

function toThing(row: ThingRecord): Thing {
  return new Thing(row.id, row.name.trim(), new Date(row.created_at));
}

export class ThingRepository implements IThingRepository {
  private readonly table: string;

  constructor(private readonly dataAdapter: ThingDataAdapter) {
    this.table = process.env.SUPABASE_THINGS_TABLE?.trim() || 'things';
  }

  async findById(id: string): Promise<Thing | null> {
    const rows = await this.dataAdapter.get<ThingRecord[]>(
      `${this.table}?select=id,name,created_at&id=eq.${encodeURIComponent(id)}`
    );
    const row = rows[0];
    return row ? toThing(row) : null;
  }

  async findAll(): Promise<Thing[]> {
    const rows = await this.dataAdapter.get<ThingRecord[]>(
      `${this.table}?select=id,name,created_at&order=created_at.asc`
    );
    return rows.map(toThing);
  }

  async save(thing: Thing): Promise<void> {
    await this.dataAdapter.post(
      `${this.table}?on_conflict=id`,
      [
        {
          id: thing.id,
          name: thing.name,
          created_at: thing.createdAt.toISOString(),
        },
      ],
      {
        headers: {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
      }
    );
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.dataAdapter.delete<Array<{ id: string }>>(
      `${this.table}?id=eq.${encodeURIComponent(id)}&select=id`
    );
    return rows.length > 0;
  }
}

