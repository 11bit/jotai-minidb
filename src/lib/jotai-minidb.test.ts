import { createStore } from "jotai/vanilla";
import { it, expect, vi, beforeEach, describe } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { entries } from "idb-keyval";
import { resolver } from "@rocicorp/resolver";

import { DatabaseConfig, MiniDb } from "./jotai-minidb";

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

async function setup(dbConfig?: DatabaseConfig<string>) {
  const db = new MiniDb<string>(dbConfig);
  const db2 = new MiniDb<string>();
  const store = createStore();
  await store.get(db.suspendBeforeInit);
  await store.get(db2.suspendBeforeInit);
  return { db, db2, store };
}

beforeEach(() => {
  BCMock.reset();
  global.indexedDB = new IDBFactory();
});

it("Initialize with empty list", async () => {
  const { db, store } = await setup();
  expect(store.get(db.keys)).toEqual([]);
  expect(store.get(db.values)).toEqual([]);
  expect(store.get(db.entries)).toEqual([]);
});

it("Initialize with default items", async () => {
  const { db, store } = await setup({
    name: "withDefaultItems",
    initialData: {
      test: "123",
      hello: "world",
    },
  });
  expect(store.get(db.items)).toEqual({ test: "123", hello: "world" });
});

it("Mount of `item` atom triggers initialization", async () => {
  const done = resolver();
  const db = new MiniDb({
    name: "item init test",
    initialData: {
      test: "123",
      hello: "world",
    },
  });
  const store = createStore();
  store.sub(db.item("test"), () => {
    expect(store.get(db.item("test"))).toEqual("123");
    done.resolve();
  });
  await done.promise;
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
  const { db, db2, store } = await setup({
    initialData: { "test-id": "new value" },
  });
  expect(store.get(db.entries)).toEqual([["test-id", "new value"]]);
  expect(store.get(db2.entries)).toEqual([["test-id", "new value"]]);
  expect(await entries(db["idbStorage"])).toEqual([["test-id", "new value"]]);

  await store.set(db.delete, "test-id");
  expect(store.get(db.entries)).toEqual([]);
  expect(store.get(db2.entries)).toEqual([]);
  expect(await entries(db["idbStorage"])).toEqual([]);
});

it("Set with function", async () => {
  const { db, store } = await setup();

  await store.set(db.set, "my-item", () => "hello");
  expect(store.get(db.items)).toEqual({ "my-item": "hello" });
  await store.set(db.set, "my-item", (oldVal) => oldVal + " world");
  expect(store.get(db.items)).toEqual({ "my-item": "hello world" });
});

it("Set item with function", async () => {
  const { db, store } = await setup();

  await store.set(db.item("123"), () => "hello");
  expect(store.get(db.items)).toEqual({ "123": "hello" });
  await store.set(db.item("123"), (oldVal) => oldVal + "123");
  expect(store.get(db.items)).toEqual({ "123": "hello123" });
});

describe("write before read", () => {
  it("set", async () => {
    const db = new MiniDb<string>();
    const store = createStore();

    await store.set(db.item("hello"), "123");
    expect(store.get(db.item("hello"))).toEqual("123");
  });

  it("set with func", async () => {
    const db = new MiniDb<string>();
    const store = createStore();

    await store.set(db.item("hello"), (old) => "123");
    expect(store.get(db.item("hello"))).toEqual("123");
  });

  it("setMany", async () => {
    const db = new MiniDb<string>();
    const store = createStore();
    const entries: [string, string][] = [
      ["hello", "world"],
      ["foo", "bar"],
    ];

    await store.set(db.setMany, entries);
    expect(store.get(db.entries)).toEqual(entries);
  });

  it("delete", async () => {
    const db = new MiniDb<string>({
      initialData: { color: "red" },
    });
    const store = createStore();

    await store.set(db.delete, "color");
    expect(store.get(db.entries)).toEqual([]);
  });

  it("clear", async () => {
    const db = new MiniDb<string>({
      initialData: { color: "blue" },
    });
    const store = createStore();

    await store.set(db.clear);
    expect(store.get(db.entries)).toEqual([]);
  });
});

describe("With custom db name", () => {
  async function setupMany(dbConfig?: DatabaseConfig<string>) {
    const db1 = new MiniDb({ name: "a", ...dbConfig });
    const db2 = new MiniDb({ name: "b" });
    const store = createStore();
    await store.get(db1.suspendBeforeInit);
    await store.get(db2.suspendBeforeInit);
    return { db1, db2, store };
  }

  it("Set", async () => {
    const { db1, db2, store } = await setupMany();

    await store.set(db1.item("123"), "new value");
    expect(store.get(db1.entries)).toEqual([["123", "new value"]]);
    expect(store.get(db2.entries)).toEqual([]);
  });

  it("Delete", async () => {
    const { db1, db2, store } = await setupMany({
      initialData: { "123": "new value" },
    });
    expect(store.get(db1.entries)).toEqual([["123", "new value"]]);
    expect(store.get(db2.entries)).toEqual([]);

    await store.set(db2.item("123"), "db2 value");
    expect(store.get(db1.entries)).toEqual([["123", "new value"]]);
    expect(store.get(db2.entries)).toEqual([["123", "db2 value"]]);

    await store.set(db1.delete, "123");
    expect(store.get(db1.entries)).toEqual([]);
    expect(store.get(db2.entries)).toEqual([["123", "db2 value"]]);
  });
});

describe("Migrations", () => {
  it("Migrates to a new version", async () => {
    const store = createStore();
    const db1 = new MiniDb({
      name: "mydb",
      onMigrationCompleted: () => {},
    });
    await store.get(db1.suspendBeforeInit);
    await store.set(db1.item("123"), { name: "hello" });

    const migratedDb = new MiniDb({
      name: "mydb",
      version: 2,
      migrations: {
        1: (item) => {
          item.value = "other prop";
          return item;
        },
        2: async (item) => {
          item.name += await Promise.resolve(" migrated");
          return item;
        },
      },
      onMigrationCompleted: () => {},
    });
    await store.get(migratedDb.suspendBeforeInit);

    expect(store.get(migratedDb.entries)).toEqual([
      ["123", { name: "hello migrated", value: "other prop" }],
    ]);
  });

  it("Do not run previous migrations", async () => {
    const store = createStore();
    const db1 = new MiniDb({
      name: "mydb2",
      onMigrationCompleted: () => {},
    });
    await store.get(db1.suspendBeforeInit);
    await store.set(db1.item("123"), { name: "" });

    // Bump version
    const bumpVersionDb = new MiniDb({
      name: "mydb2",
      version: 1,
      migrations: {
        1: (item) => item,
      },
      onMigrationCompleted: () => {},
    });
    await store.get(bumpVersionDb.suspendBeforeInit);

    // Migrate
    const migratedDb = new MiniDb({
      name: "mydb2",
      version: 2,
      migrations: {
        1: (item) => {
          item.name += "migrated to 1";
          return item;
        },
        2: (item) => {
          item.name += "migrated to 2";
          return item;
        },
      },
    });
    await store.get(migratedDb.suspendBeforeInit);

    expect(store.get(migratedDb.entries)).toEqual([
      ["123", { name: "migrated to 2" }],
    ]);
  });
});
