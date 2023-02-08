# jotai-minidb - Jotai atoms for IndexedDB key-value storage persistency

Simple but fully functional way to persist key-value data in IndexedDb for Jotai. Analogues to [atomWithStorage](https://jotai.org/docs/utils/atom-with-storage) but when localStorage is not enough.

> ⚠️ IMPORTANT: This package was initially created to experiment with [Jotai v2 API](https://jotai.org/docs/guides/migrating-to-v2-api) and currently doesn't support v1. Please open an issue if you are interested to use it with v1.


[Demo App](https://json-box.vercel.app/) | [Repo](https://github.com/11bit/json-box)

# Features

- IndexedDB persistency
- TypeScript support
- Cross-tab sync (changes in one browser tab are automatically synced to other tabs)
- Data migrations (if you have some local data you will have to migrate it sooner or later)

# Installation

```
yarn add jotai-minidb jotai
```

# Usage

First, you need to create instance of a `MiniDb` class.

```js
import { MiniDb } from "jotai-minidb";
const myDb = new MiniDb();
```

After `MiniDb` instance is created it provides set of atoms to Interact with IndexedDB storage:

```js
function MyComponent() {
  const [user, setUser] = useAtom(myDb.item("user-123"));

  return (
    <input
      value={user.name}
      onChange={(e) => setUser({ ...user, name: e.target.value })}
    />
  );
}
```

# API

## Atoms for reading all stored items

- `myDb.keys` - read-only atom with an array of stored keys `Atom<string[]>`
- `myDb.values` - read-only atom with an array of stored values `Atom<T[]>`
- `myDb.items` - - read-only atom with an key/value cache `Atom<Record<string, T>>`
- `myDb.entries` - read-only atom with [key, value] entries `Atom<[string, T][]>`

## Atom to read/write item

```js
const [item, setItem] = useAtom(myDb.item(key));
```

## Other write atoms

### Set value of the item by key

```js
const set = useSetAtom(myDb.set);
set(key, value);
```

### Set many items with an array of entries

```js
const setMany = useSetAtom(myDb.setMany)
setMany([
  ['key-1', 1],
  ['key-2', 33],
  ...
])
```

### Delete by key

```js
const delete = useSetAtom(myDb.delete)
delete(key)
```

### Clear all

```js
const clear = useSetAtom(myDb.clear);
clear();
```

# Examples

```js
// Jotai V2 API!
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { MiniDb } from "jotai-minidb";

// Type of an item in key-value store
type Item = {
  name: string;
};

// 1. Create a minidb instance
const myDb = new MiniDb<Item>();

// 2. Get all keys, values or entries
export function Entries() {
  const keys = useAtomValue(myDb.keys);
  const values = useAtomValue(myDb.values);
  const entries = useAtomValue(myDb.entries);

  return (
    <div>
      Keys:
      <ul>
        {keys.map((key) => (
          <li>{key}</li>
        ))}
      </ul>

      Values:
      <ul>
        {values.map((value) => (
          <li>{value.name}</li>
        ))}
      </ul>

      Entries:
      <ul>
        {entries.map(([key, value]) => (
          <li>{value.name}</li>
        ))}
      </ul>
    </div>
  );
}

// 3. Get, or set item in a store
export function Entry() {
  const [item, setItem] = useAtom(myDb.item("some-item-key"));

  if (!item) {
    return null;
  }

  return (
    <input
      value={item.name}
      onChange={(e) => setItem({ ...item, name: e.target.value })}
    />
  );
}

// 4. Create new item or delete item
export function CreateUpdateOrDelete() {
  const set = useSetAtom(simpleStore.set);
  const del = useSetAtom(simpleStore.delete);

  return (
    <>
      <button onClick={() => set("some-key", { name: "new value" })}>
        Create
      </button>
      <button onClick={() => del("some-key")}>Delete</button>
    </>
  );
}
```

# Configuration

MiniDb constructor takes an optional configuration object with the following parameters:

## **name**

    default: `jotai-minidb`

Database name. If you need multiple collections you can simply define multiple storages with different names:

```
const books = new MiniDb({ name: 'books' })
const authors = new MiniDb({ name: 'authors' })
```

## **version**

    default: 0

Schema version is used to introduce breaking change to a shape of the data stored in a database. If data in IndexedDb has a version lower than **version** then it is migrated with set of **migrations**. If **version** is lower than version of the data in IndexedDb then exception is thrown and `onVersionMissmatch` handler is called

## **initialData**

    type: Record<string, Item>
    default: {}

Populate database with some initial data when it is created

## **migrations**

    default: {}

If **version** is greater than 0 you should provide a migration function for each version in **migrations** object where a key is `version` and value is a migration function

```
const myDb = new MiniDb<Item>({
    version: 2,
    migrations: {
        1: (item) => {
            item.age = 18
            return item
        },
        2: (item) => {
            // migrate from 1 => 2
        }
    },
});
```

## **onMigrationCompleted**

    default: () => {
        alert("Data has been migrated. Page will be reloaded");
        window.location.reload();
    }

Callback that is called when migration is completed in _other browser tab or window_. For instance when user opens a new tab with the new version of the app.
In simple cases the easiest way is to refresh the page because the old code likely can not work with migrated data anyway

## **onVersionMissmatch**

    deafult: () => {}

Callback that is called when version of the data in IndexedDb is _higher_ than the **version**. Should not happen in normal situations
