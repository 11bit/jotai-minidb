# jotai-minidb - Jotai atoms factory for IndexedDb key-value storage

Simple but fully functional way to persist key-value data in IndexedDb for Jotai. Analogues to [atomWithStorage](https://jotai.org/docs/utils/atom-with-storage) but when localStorage is not enough.

> ⚠️ IMPORTANT: This package was initially created to experiment with [Jotai v2 API](https://jotai.org/docs/guides/migrating-to-v2-api) and currently doesn't support v1. Please open an issue if you are interested to use it with v1.

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

First, you need to create instance of a `MiniDb` class. `MiniDb` class instance provides set of atoms for reading and writing to IndexedDb storage

```js
import { MiniDb } from "jotai-minidb";
const myDb = new MiniDb();
```

## Read

- `useAtomValue(myDb.keys)` - get all stored keys
- `useAtomValue(myDb.values)` - get all values
- `useAtomValue(myDb.items)` - get key-value object
- `useAtomValue(myDb.entries)` - get all [key, value] entries

## Read/write item

```js
const [item, setItem] = useAtom(myDb.item(key));
```

## Write

### set value of the item by the key `key`

```js
const set = useSetAtom(myDb.set);
set(key, value);
```

### update may items in the storage with an array of entries

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

// Create a minidb class with set of atoms to access to IndexedDb
const myDb = new MiniDb<Item>();

// 1. Get all keys, values or entries
export function Entries() {
  const keys = useAtomValue(myDb.keys);
  const values = useAtomValue(myDb.values);
  const entries = useAtomValue(myDb.entries);

  return entries.map(([key, entry]) => (<li>{entry.name}</li>))
}

// 2. Get, or set item in a store
export function Entry() {
  const [item, setItem] = useAtom(myDb.item('some-item-key'));

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
      <button onClick={() => set('some-key', { name: 'new value' })}>Create</button>
      <button onClick={() => delete('some-key')}>Delete</button>
    </>
  )
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
