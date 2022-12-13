import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";

import { JotaiMiniDb } from "./lib/jotai-minidb";

const simpleStore = new JotaiMiniDb();

function getNewItem() {
  return {
    name: "",
  };
}

export default function Showcase() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const entries = useAtomValue(simpleStore.entries);
  const set = useSetAtom(simpleStore.set);
  const del = useSetAtom(simpleStore.delete);

  return (
    <div className="container">
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
