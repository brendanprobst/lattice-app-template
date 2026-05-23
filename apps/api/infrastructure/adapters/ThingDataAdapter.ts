export type { DataAdapter, DataAdapterOptions } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

/** @deprecated Use {@link DataAdapter} from `./dataAdapter/DataAdapter`. */
export type { DataAdapter as ThingDataAdapter } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

/** @deprecated Use {@link DataAdapterOptions}. */
export type { DataAdapterOptions as ThingDataAdapterOptions } from '@api/infrastructure/adapters/dataAdapter/DataAdapter';

export type ThingRecord = {
  id: number;
  name: string;
  created_at: string;
};
