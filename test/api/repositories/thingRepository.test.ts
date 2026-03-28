import { Thing } from '@api/domain/entities/Thing';
import { ThingRepository } from '@api/infrastructure/repositories/ThingRepository';
import { MockedThingDataAdapter } from '../support/fakes/MockedThingDataAdapter';

describe('ThingRepository', () => {
  let repository: ThingRepository;

  beforeEach(() => {
    repository = new ThingRepository(new MockedThingDataAdapter());
  });

  it('creates a thing', async () => {
    const thing = new Thing(1, 'Alpha', new Date('2026-01-01T00:00:00.000Z'));
    await repository.save(thing);

    const found = await repository.findById(1);
    expect(found?.toPrimitives()).toEqual(thing.toPrimitives());
  });

  it('lists things', async () => {
    await repository.save(new Thing(1, 'Alpha', new Date('2026-01-01T00:00:00.000Z')));
    await repository.save(new Thing(2, 'Beta', new Date('2026-01-02T00:00:00.000Z')));

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(1);
    expect(all[1].id).toBe(2);
  });

  it('gets one thing by id', async () => {
    await repository.save(new Thing(1, 'Alpha', new Date('2026-01-01T00:00:00.000Z')));

    const found = await repository.findById(1);
    expect(found?.id).toBe(1);
    expect(found?.name).toBe('Alpha');
  });

  it('updates an existing thing', async () => {
    const thing = new Thing(1, 'Alpha', new Date('2026-01-01T00:00:00.000Z'));
    await repository.save(thing);

    thing.updateName('Gamma');
    await repository.save(thing);

    const found = await repository.findById(1);
    expect(found?.name).toBe('Gamma');
  });

  it('deletes a thing', async () => {
    await repository.save(new Thing(1, 'Alpha', new Date('2026-01-01T00:00:00.000Z')));

    const deleted = await repository.delete(1);
    expect(deleted).toBe(true);

    const afterDelete = await repository.findById(1);
    expect(afterDelete).toBeNull();
  });

  it('returns false when deleting missing thing', async () => {
    const deleted = await repository.delete(999999);
    expect(deleted).toBe(false);
  });
});
