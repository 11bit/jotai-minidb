import { createStore } from "jotai/vanilla";
import { it, expect, vi, beforeEach, describe } from "vitest";
import "fake-indexeddb/auto";

import { entries } from "idb-keyval";
import { JotaiMiniDb, INIT } from "./jotai-minidb";

class BCMock {
  static instances: BCMock[] = [];
  static reset() {
    this.instances = [];
  }

  constructor(protected name: string) {
    BCMock.instances.push(this);
  }
  onmessage = (event: MessageEvent) => {};
  postMessage = (data: any) => {
    for (const instance of BCMock.instances) {
      if (instance !== this && instance.name === this.name) {
        instance.onmessage(new MessageEvent("data", { data }));
      }
    }
  };
}

vi.stubGlobal("BroadcastChannel", BCMock);

async function setup() {
  const db = new JotaiMiniDb();
  const db2 = new JotaiMiniDb();
  const store = createStore();
  store.set(db.items, INIT);
  store.set(db2.items, INIT);
  await store.get(db.initialized);
  await store.get(db2.initialized);
  return { db, db2, store };
}

beforeEach(() => {
  BCMock.reset();
});

it("Initialize with empty list", async () => {
  const { db, store } = await setup();
  expect(store.get(db.keys)).toEqual([]);
  expect(store.get(db.values)).toEqual([]);
  expect(store.get(db.entries)).toEqual([]);
});

it("Set", async () => {
  const { db, db2, store } = await setup();

  await store.set(db.item("test-id"), "new value");
  expect(store.get(db.keys)).toEqual(["test-id"]);
  expect(store.get(db.values)).toEqual(["new value"]);
  expect(store.get(db.entries)).toEqual([["test-id", "new value"]]);

  expect(store.get(db2.entries)).toEqual([["test-id", "new value"]]);
  expect(await entries(db["idbStorage"])).toEqual([["test-id", "new value"]]);
});

it("Delete", async () => {
  const { db, db2, store } = await setup();
  expect(store.get(db.entries)).toEqual([["test-id", "new value"]]);
  expect(store.get(db2.entries)).toEqual([["test-id", "new value"]]);
  expect(await entries(db["idbStorage"])).toEqual([["test-id", "new value"]]);

  await store.set(db.delete, "test-id");
  expect(store.get(db.entries)).toEqual([]);
  expect(store.get(db2.entries)).toEqual([]);
  expect(await entries(db["idbStorage"])).toEqual([]);
});

describe("With custom db name", () => {
  async function setupMany() {
    const db1 = new JotaiMiniDb("a");
    const db2 = new JotaiMiniDb("b");
    const store = createStore();
    store.set(db1.items, INIT);
    store.set(db2.items, INIT);
    await store.get(db1.initialized);
    await store.get(db2.initialized);
    return { db1, db2, store };
  }

  it("Custom db name", async () => {
    const { db1, db2, store } = await setupMany();

    await store.set(db1.item("123"), "new value");
    expect(store.get(db1.entries)).toEqual([["123", "new value"]]);
    expect(store.get(db2.entries)).toEqual([]);
  });
});
