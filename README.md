# jotai-minidb - Simple jotai interface for IndexedDB key-value storage

Simple but fully functional way to persist your Jotai atoms in IndexedDB. Analogues to [atomWithStorage](https://jotai.org/docs/utils/atom-with-storage) but when localStorage is not enough.

> ⚠️ IMPORTANT: This package was implemented to experiment with [Jotai v2 API](https://jotai.org/docs/guides/migrating-to-v2-api) and currently doesn't support v1. It is not hard to part it though. Please open an issue if you are interested to use it in v1.

# Features

- IndexedDB persistency
- Cross-tab sync (changes in one browser tab are automatically synced to other tabs)
- Versioning and migrations (if you have some local data you will have to migrate it sooner or later)

# Examples

```js
// Jotai V2 API!
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";

import { JotaiMiniDb } from "jotai-minidb";

// Items in a store can be typed
type Item = {
  name: string;
};

// Create a store (with default database name)
const myStore = new JotaiMiniDb<Item>();

// Multiple stores connected to different databases can be created
const myOtherStore = new JotaiMiniDb<string>()

// 1. Get all keys, values or entries
export function Entries() {
    const keys = useAtomValue(myStore.keys);
    const values = useAtomValue(myStore.values);
    const entries = useAtomValue(myStore.entries);

    return entries.map(([key, entry]) => <li>{entry.name}</li>)
}

// 2. Get, or set item in a store
export function Entry() {
    const [item, setItem] = useAtom(myStore.item('some-item-key'));

    if (!item) {
        return null
    }

    return (
        <input
            value={item.name}
            onChange={(e) => setItem({ ...item, name: e.target.value })}
      />
    )
}

// 3. Create new item or delete item
export function CreateUpdateOrDelete() {
  const set = useSetAtom(simpleStore.set);
  const delete = useSetAtom(simpleStore.delete);

  return (
    <>
        <Button onClick={() => set('some-key', { name: 'new value' })}>Create</button>
        <Button onClick={() => delete('some-key')}>Delete</button>
    </>
  )
}

// 4. Migrate schema
// In a new version of the Item we want to add an age property with some default value
type Item = {
  name: string;
  age: number;
};

const myStore = new JotaiMiniDb<Item>({
    version: 1,
    migrations: {
        1: (item) => {
            item.age = 18
            return item
        }
    }
});
```
