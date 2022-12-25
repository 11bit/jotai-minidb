import { WritableAtom, Atom } from "jotai/vanilla";
import { it, expectTypeOf } from "vitest";
import { MiniDb } from "./jotai-minidb";

type Item = {
  my: string;
  prop: number;
};

it("item atom typings", () => {
  const db = new MiniDb<Item>();
  expectTypeOf(db.item("123")).toMatchTypeOf<
    WritableAtom<Item | undefined, [Item], Promise<void>>
  >();
});

it("entries atom typings", () => {
  const db = new MiniDb<Item>();
  expectTypeOf(db.entries).toMatchTypeOf<Atom<[string, Item][]>>();
});

it("keys atom typings", () => {
  const db = new MiniDb<Item>();
  expectTypeOf(db.keys).toMatchTypeOf<Atom<string[]>>();
});

it("values atom typings", () => {
  const db = new MiniDb<Item>();
  expectTypeOf(db.values).toMatchTypeOf<Atom<Item[]>>();
});
