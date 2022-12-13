/**
 * Experiment with jotai v2 api and simple key-value store (no types, no collections)
 * TODO:
 * - Full CRUD
 * - Refactor
 * - Migrations mechanics
 * - Types
 * - clean atom family when delete
 * - Test as library
 */

import * as idb from "idb-keyval";
import { atom } from "jotai/vanilla";
import { atomFamily } from "jotai/vanilla/utils";

type Value = any;
type Cache = Record<string, Value>;
type BroadcastEvent =
  | {
      type: "UPDATE";
      id: string;
      item: Value;
    }
  | {
      type: "DELETE";
      id: string;
    };
export const INIT = Symbol("Reload");

export class JotaiMiniDb {
  private channel = new BroadcastChannel("jotai-minidb");
  private cache = atom<Cache | undefined>(undefined);
  private onInitilized!: VoidFunction;
  private initPromise = new Promise<void>((resolve) => {
    this.onInitilized = resolve;
  });
  private isInitialized = false;

  constructor() {
    this.items.onMount = (set) => {
      set(INIT);
    };
  }

  initialized = atom(() => this.initPromise);

  items = atom(
    (get) => get(this.cache),
    async (get, set, update: typeof INIT) => {
      if (update === INIT && !this.isInitialized) {
        set(this.cache, Object.fromEntries(await idb.entries()));
        this.channel.onmessage = (event: MessageEvent<BroadcastEvent>) => {
          if (event.data.type === "UPDATE") {
            set(this.cache, (data) => ({
              ...data,
              [event.data.id]: event.data.item,
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
      async (_get, set, update: Value) => {
        await set(this.set, id, update);
      }
    )
  );

  set = atom(null, async (get, set, id: string, value: Value) => {
    if (!get(this.cache)) {
      throw new Error("Write to store before it is loaded");
    }
    await idb.set(id, value);
    set(this.cache, (data) => ({ ...data, [id]: value }));
    this.channel.postMessage({ type: "UPDATE", id, item: value });
  });

  delete = atom(null, async (get, set, id: string) => {
    if (!get(this.cache)) {
      throw new Error("Delete from the store before it is loaded");
    }
    await idb.del(id);
    set(this.cache, (data) => {
      const copy = { ...data };
      delete copy[id];
      return copy;
    });
    this.channel.postMessage({ type: "DELETE", id });
  });
}
