/**
 * Experiment with jotai v2 api and simple key-value store (no types, no collections)
 * TODO:
 * - Write README
 * - Publish
 * - Migrations: other tabs
 * - MIgrations: way to setup migrations without specifying a db name
 *
 * - Full CRUD
 *   - clear
 *   - something else?
 * - Refactor
 * - Clean atom family when delete
 * - Test as library
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
type BroadcastEvent<Item> = BroadcastEventUpdate<Item> | BroadcastEventDelete;

type MigrateFn = (previousState: any) => any;
type Migrations = Record<number, MigrateFn>;
type Config = { version: number; migrations: Migrations };

export const INIT = Symbol("Reload");
export const DEFAULT_DB_NAME = "jotai-minidb";

export class JotaiMiniDb<Item> {
  private channel: BroadcastChannel;
  private cache = atom<Cache<Item> | undefined>(undefined);
  private onInitilized!: VoidFunction;
  private initPromise = new Promise<void>((resolve) => {
    this.onInitilized = resolve;
  });
  private isInitialized = false;
  private idbStorage: idb.UseStore;
  private metaStorage: idb.UseStore;

  constructor(
    readonly name: string = DEFAULT_DB_NAME,
    private readonly config: Config = { version: 0, migrations: {} }
  ) {
    const { keyvalStorage, metaStorage } = createStore(
      name,
      "key-value",
      config
    );
    this.idbStorage = keyvalStorage;
    this.metaStorage = metaStorage;

    this.channel = new BroadcastChannel(`jotai-minidb-broadcast:${name}`);
    this.items.onMount = (set) => {
      set(INIT);
    };
  }

  protected async migrate() {
    const currentVersion =
      (await this.metaStorage("readonly", (store) =>
        idb.promisifyRequest(store.get("version"))
      )) || 0;

    if (this.config.version > currentVersion) {
      let entries = await idb.entries(this.idbStorage);

      for (let ver = currentVersion + 1; ver <= this.config.version; ver++) {
        entries = await Promise.all(
          entries.map(
            async ([key, value]) =>
              [key, await this.config.migrations[ver](value)] as [
                IDBValidKey,
                any
              ]
          )
        );
      }

      await idb.setMany(entries, this.idbStorage);

      await this.metaStorage("readwrite", (store) =>
        idb.promisifyRequest(store.put(this.config.version, "version"))
      );
    }
  }

  initialized = atom(() => this.initPromise);

  items = atom(
    (get) => get(this.cache),
    async (get, set, update: typeof INIT) => {
      if (update === INIT && !this.isInitialized) {
        await this.migrate();
        set(this.cache, Object.fromEntries(await idb.entries(this.idbStorage)));
        this.channel.onmessage = (
          event: MessageEvent<BroadcastEvent<Item>>
        ) => {
          if (event.data.type === "UPDATE") {
            set(this.cache, (data) => ({
              ...data,
              [event.data.id]: (event.data as BroadcastEventUpdate<Item>).item,
            }));
          } else if (event.data.type === "DELETE") {
            set(this.cache, (data) => {
              const copy = { ...data };
              delete copy[event.data.id];
              return copy;
            });
          }
        };
        this.onInitilized();
      }
    }
  );

  entries = atom((get) => Object.entries(get(this.items) || {}));
  keys = atom((get) => Object.keys(get(this.items) || {}));
  values = atom((get) => Object.values(get(this.items) || {}));
  item = atomFamily((id: string) =>
    atom(
      (get) => get(this.items)?.[id],
      async (_get, set, update: Item) => {
        await set(this.set, id, update);
      }
    )
  );

  set = atom(null, async (get, set, id: string, value: Item) => {
    if (!get(this.cache)) {
      throw new Error("Write to store before it is loaded");
    }
    await idb.set(id, value, this.idbStorage);
    set(this.cache, (data) => ({ ...data, [id]: value }));
    this.channel.postMessage({ type: "UPDATE", id, item: value });
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
}

function createStore(
  dbName: string,
  storeName: string,
  config: Config
): { keyvalStorage: idb.UseStore; metaStorage: idb.UseStore } {
  const request = indexedDB.open(dbName);
  request.onupgradeneeded = (event) => {
    request.result.createObjectStore(storeName);
    request.result.createObjectStore("_meta");
  };
  const dbp = idb.promisifyRequest(request);

  return {
    keyvalStorage: (txMode, callback) =>
      dbp.then((db) =>
        callback(db.transaction(storeName, txMode).objectStore(storeName))
      ),
    metaStorage: (txMode, callback) =>
      dbp.then((db) =>
        callback(db.transaction("_meta", txMode).objectStore("_meta"))
      ),
  };
}
