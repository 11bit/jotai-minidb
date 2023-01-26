/**
 * Experiment with jotai v2 api and simple key-value store (no types, no collections)
 * TODO:
 * - Refactor
 * - More test
 * - Clean atom family when delete
 * - Migrations: validate correct migrations are provided, decide what to do if migration doesn't return item
 */

import * as idb from "idb-keyval";
import { atom } from "jotai/vanilla";
import { atomFamily } from "jotai/vanilla/utils";

type Cache<Item> = Record<string, Item>;
type BroadcastEventUpdate<Item> = {
  type: "UPDATE";
  id: string;
  item: Item;
};
type BroadcastEventDelete = {
  type: "DELETE";
  id: string;
};
type BroadcastEventUpdateMany = {
  type: "UPDATE_MANY";
};
type BroadcastEventMigrationCompleted = {
  type: "MIGRATION_COMPLETED";
};
type BroadcastEvent<Item> =
  | BroadcastEventUpdate<Item>
  | BroadcastEventDelete
  | BroadcastEventUpdateMany
  | BroadcastEventMigrationCompleted;

type MigrateFn = (previousState: any) => any;
type Migrations = Record<number, MigrateFn>;
type Config = {
  name: string;
  version: number;
  migrations: Migrations;
  onMigrationCompleted: VoidFunction;
  onVersionMissmatch: VoidFunction;
};

type ConfigWithInitialData<Item> = Config & {
  initialData: Record<string, Item>;
};

export type DatabaseConfig<Item> = Partial<ConfigWithInitialData<Item>>;

export const DEFAULT_DB_NAME = "jotai-minidb";

const DEFAULT_CONFIG: Config = {
  name: DEFAULT_DB_NAME,
  version: 0,
  migrations: {},
  onMigrationCompleted: () => {
    alert("Data has been migrated. Page will be reloaded");
    window.location.reload();
  },
  onVersionMissmatch: () => {},
};

export class MiniDb<Item> {
  private channel!: BroadcastChannel;
  private cache = atom<Cache<Item> | undefined>(undefined);
  private idbStorage: idb.UseStore;
  private metaStorage: idb.UseStore;
  private config: ConfigWithInitialData<Item>;

  // Initialization
  private initStarted = atom(false);
  private initialDataThenable = atomWithThenable();

  constructor(config: DatabaseConfig<Item> = {}) {
    this.config = { ...DEFAULT_CONFIG, initialData: {}, ...config };
    const { keyvalStorage, metaStorage } = createStore(
      this.config.name,
      "key-value",
      this.config.initialData
    );
    this.idbStorage = keyvalStorage;
    this.metaStorage = metaStorage;
    this.channel = new BroadcastChannel(
      `jotai-minidb-broadcast:${this.config.name}`
    );
  }

  suspendBeforeInit = atom(async (get) => {
    get(this.items);
    await get(this.initialDataThenable).promise;
  });

  isInitialized = atom(false);

  items = atom<Cache<Item> | undefined, [void], void>(
    (get, { setSelf }) => {
      if (!get(this.initStarted)) {
        Promise.resolve().then(setSelf);
      }

      return get(this.cache);
    },
    async (get, set) => {
      if (!get(this.initStarted)) {
        set(this.initStarted, true);
        this.preloadData().then((data) => {
          set(this.cache, data);
          get(this.initialDataThenable).resolve();
        });

        this.channel.onmessage = async (
          event: MessageEvent<BroadcastEvent<Item>>
        ) => {
          const payload = event.data;
          if (payload.type === "UPDATE") {
            set(this.cache, (data) => ({
              ...data,
              [payload.id]: payload.item,
            }));
          } else if (payload.type === "DELETE") {
            set(this.cache, (data) => {
              const copy = { ...data };
              delete copy[payload.id];
              return copy;
            });
          } else if (payload.type === "UPDATE_MANY") {
            set(
              this.cache,
              Object.fromEntries(await idb.entries(this.idbStorage))
            );
          } else if (payload.type === "MIGRATION_COMPLETED") {
            this.config.onMigrationCompleted();
          }
        };
      }
    }
  );

  entries = atom((get) => Object.entries(get(this.items) || {}));
  keys = atom((get) => Object.keys(get(this.items) || {}));
  values = atom((get) => Object.values(get(this.items) || {}));
  item = atomFamily((id: string) =>
    atom(
      (get) => get(this.items)?.[id],
      async (_get, set, update: ValueOrSetter<Item>) => {
        await set(this.set, id, update);
      }
    )
  );

  set = atom(
    null,
    async (get, set, id: string, valueOrSetter: ValueOrSetter<Item>) => {
      const cache = get(this.cache);
      if (!cache) {
        throw new Error("Write to store before it is loaded");
      }
      const value = isSetter(valueOrSetter)
        ? valueOrSetter(cache[id])
        : valueOrSetter;

      await idb.set(id, value, this.idbStorage);

      set(this.cache, (data) => ({ ...data, [id]: value }));
      this.channel.postMessage({ type: "UPDATE", id, item: value });
    }
  );

  setMany = atom(null, async (get, set, entries: [string, Item][]) => {
    if (!get(this.cache)) {
      throw new Error("Write to store before it is loaded");
    }
    await idb.setMany(entries, this.idbStorage);

    const data = { ...get(this.cache) };
    for (const [key, val] of entries) {
      data[key] = val;
    }
    set(this.cache, data);
    this.channel.postMessage({ type: "UPDATE_MANY" });
  });

  delete = atom(null, async (get, set, id: string) => {
    if (!get(this.cache)) {
      throw new Error("Delete from the store before it is loaded");
    }
    await idb.del(id, this.idbStorage);
    set(this.cache, (data) => {
      const copy = { ...data };
      delete copy[id];
      return copy;
    });
    this.channel.postMessage({ type: "DELETE", id });
  });

  clear = atom(null, async (get, set) => {
    if (!get(this.cache)) {
      throw new Error("Delete from the store before it is loaded");
    }
    await idb.clear(this.idbStorage);
    set(this.cache, {});
    this.channel.postMessage({ type: "UPDATE_MANY" });
  });

  protected async preloadData() {
    await this.migrate();
    return Object.fromEntries(await idb.entries(this.idbStorage));
  }

  protected async migrate() {
    const currentVersion =
      (await this.metaStorage("readonly", (store) =>
        idb.promisifyRequest(store.get("version"))
      )) || 0;

    if (this.config.version > currentVersion) {
      let entries = await idb.entries(this.idbStorage);

      for (let ver = currentVersion + 1; ver <= this.config.version; ver++) {
        const migrateFn = this.config.migrations[ver];
        if (!migrateFn) {
          throw new Error(
            `Migrate function for version ${ver} is not provided`
          );
        }
        entries = await Promise.all(
          entries.map(
            async ([key, value]) =>
              [key, await migrateFn(value)] as [IDBValidKey, any]
          )
        );
      }

      await idb.setMany(entries, this.idbStorage);

      await this.metaStorage("readwrite", (store) =>
        idb.promisifyRequest(store.put(this.config.version, "version"))
      );

      this.channel.postMessage({ type: "MIGRATION_COMPLETED" });
    } else if (this.config.version < currentVersion) {
      // Old client?
      this.config.onVersionMissmatch();
      throw new Error(
        `[jotai-minidb] Minimal client version is ${this.config.version} but indexeddb database version is ${currentVersion}`
      );
    }
  }
}

function atomWithThenable<K = void>() {
  return atom(() => {
    let resolve!: (data: K) => void, reject!: (error: unknown) => void;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return {
      promise,
      resolve,
      reject,
    };
  });
}

function createStore(
  dbName: string,
  storeName: string,
  initialData: Record<string, unknown>
): { keyvalStorage: idb.UseStore; metaStorage: idb.UseStore } {
  const request = indexedDB.open(dbName);
  const initialDataAddRequests: Promise<IDBValidKey>[] = [];
  request.onupgradeneeded = (event) => {
    const objectStore = request.result.createObjectStore(storeName);
    request.result.createObjectStore("_meta");

    for (const [key, value] of Object.entries(initialData)) {
      initialDataAddRequests.push(
        idb.promisifyRequest(objectStore.add(value, key))
      );
    }
  };
  const dbp = idb.promisifyRequest(request);

  return {
    keyvalStorage: async (txMode, callback) => {
      const db = await dbp;
      await Promise.all(initialDataAddRequests);
      return callback(db.transaction(storeName, txMode).objectStore(storeName));
    },
    metaStorage: (txMode, callback) =>
      dbp.then((db) =>
        callback(db.transaction("_meta", txMode).objectStore("_meta"))
      ),
  };
}

type Setter<Item> = (oldVal: Item | undefined) => Item;
type ValueOrSetter<Item> = Item | Setter<Item>;

function isSetter<Item>(value: ValueOrSetter<Item>): value is Setter<Item> {
  return typeof value === "function";
}
