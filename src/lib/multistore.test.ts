import { createStore } from "jotai/vanilla";
import { it, expect, vi, beforeEach, describe } from "vitest";
import "fake-indexeddb/auto";
import { MiniDb } from "./jotai-minidb";

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

it("should work with multiple stores", async () => {
  const db = new MiniDb<string>();
  const store1 = createStore();
  const store2 = createStore();

  await store1.get(db.suspendBeforeInit);
  await store2.get(db.suspendBeforeInit);
  expect(store1.get(db.items)).toEqual({});
  expect(store2.get(db.items)).toEqual({});
});
