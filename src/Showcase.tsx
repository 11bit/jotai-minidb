import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";

import { MiniDb } from "./lib/jotai-minidb";

type Item = {
  name: string;
};
const simpleStore = new MiniDb<Item>();

function getNewItem(): Item {
  return {
    name: "",
  };
}

export default function Showcase() {
  useAtomValue(simpleStore.initStatus);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = useAtomValue(simpleStore.entries);
  const set = useSetAtom(simpleStore.set);
  const del = useSetAtom(simpleStore.delete);

  return (
    <div className="container">
      <h1>Jotai-minidb example app</h1>
      <div className="sidebar">
        <ul>
          {entries.map(([key, item]) => (
            <li key={key}>
              <button onClick={() => setSelectedId(key)}>
                {item.name || "Untitled"}
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            set(crypto.randomUUID(), getNewItem());
          }}
        >
          Add ➕
        </button>
        <Populate />
        <Clear />
      </div>
      <div className="item">
        {selectedId && (
          <Item
            id={selectedId}
            onDelete={() => {
              setSelectedId(null);
              del(selectedId);
            }}
          />
        )}
      </div>
    </div>
  );
}

function Item({ id, onDelete }: { id: string; onDelete: VoidFunction }) {
  const [item, setItem] = useAtom(simpleStore.item(id));

  if (!item) {
    return null;
  }

  return (
    <div>
      <h3>Item #{id}</h3>
      Name:{" "}
      <input
        placeholder="Enter name"
        value={item.name}
        onChange={(e) => setItem({ ...item, name: e.target.value })}
      />
      <button onClick={onDelete}>Delete ❌ </button>
    </div>
  );
}

function Populate() {
  const setMany = useSetAtom(simpleStore.setMany);
  const clear = useSetAtom(simpleStore.clear);

  const populate = async () => {
    await clear();
    const items: [string, Item][] = Array.from({ length: 10 }).map((_, i) => [
      `id-${i}`,
      {
        name: `item ${i + 1}`,
      },
    ]);
    await setMany(items);
  };

  return <button onClick={populate}>Populate</button>;
}

function Clear() {
  const clear = useSetAtom(simpleStore.clear);
  return <button onClick={() => clear()}>Clear</button>;
}
