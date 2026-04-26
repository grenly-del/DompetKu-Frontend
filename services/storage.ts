import { Platform } from 'react-native';

type StorageShape = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  multiRemove: (keys: string[]) => Promise<void>;
};

type StorageRecord = Record<string, string>;

const memoryStore = new Map<string, string>();
const storageFileName = 'auth-storage.json';

let filesystemModulePromise: Promise<typeof import('expo-file-system') | null> | null = null;
let filesystemStoreCache: StorageRecord | null = null;
let filesystemStorePromise: Promise<StorageRecord> | null = null;

async function resolveFilesystemModule() {
  if (filesystemModulePromise === null) {
    filesystemModulePromise = import('expo-file-system').catch(() => null);
  }

  return filesystemModulePromise;
}

function readLocalStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Ignore storage errors in web/private browsing environments.
  }
}

function removeLocalStorage(key: string) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Ignore storage errors in web/private browsing environments.
  }
}

async function loadFilesystemStore(): Promise<StorageRecord> {
  const filesystem = await resolveFilesystemModule();

  if (!filesystem) {
    return Object.fromEntries(memoryStore.entries());
  }

  try {
    const file = new filesystem.File(filesystem.Paths.document, storageFileName);

    if (!file.exists) {
      return {};
    }

    const raw = await file.text();

    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as StorageRecord;
  } catch {
    return {};
  }
}

async function getFilesystemStore(): Promise<StorageRecord> {
  if (filesystemStoreCache !== null) {
    return filesystemStoreCache;
  }

  if (!filesystemStorePromise) {
    filesystemStorePromise = loadFilesystemStore();
  }

  filesystemStoreCache = await filesystemStorePromise;
  return filesystemStoreCache;
}

async function saveFilesystemStore(nextStore: StorageRecord) {
  filesystemStoreCache = nextStore;

  const filesystem = await resolveFilesystemModule();
  if (!filesystem) {
    memoryStore.clear();
    for (const [key, value] of Object.entries(nextStore)) {
      memoryStore.set(key, value);
    }
    return;
  }

  try {
    const file = new filesystem.File(filesystem.Paths.document, storageFileName);
    file.write(JSON.stringify(nextStore), { encoding: 'utf8' });
  } catch {
    // Keep the in-memory cache in sync even if persistence fails.
  }
}

const webStorage: StorageShape = {
  async getItem(key: string) {
    return readLocalStorage(key);
  },
  async setItem(key: string, value: string) {
    writeLocalStorage(key, value);
  },
  async removeItem(key: string) {
    removeLocalStorage(key);
  },
  async multiRemove(keys: string[]) {
    for (const key of keys) {
      removeLocalStorage(key);
    }
  },
};

const nativeStorage: StorageShape = {
  async getItem(key: string) {
    const store = await getFilesystemStore();
    return store[key] ?? null;
  },
  async setItem(key: string, value: string) {
    const store = await getFilesystemStore();
    await saveFilesystemStore({
      ...store,
      [key]: value,
    });
  },
  async removeItem(key: string) {
    const store = await getFilesystemStore();
    if (!(key in store)) {
      return;
    }

    const nextStore = { ...store };
    delete nextStore[key];
    await saveFilesystemStore(nextStore);
  },
  async multiRemove(keys: string[]) {
    const store = await getFilesystemStore();
    const nextStore = { ...store };
    let changed = false;

    for (const key of keys) {
      if (key in nextStore) {
        delete nextStore[key];
        changed = true;
      }
    }

    if (changed) {
      await saveFilesystemStore(nextStore);
    }
  },
};

const storage: StorageShape = Platform.OS === 'web' ? webStorage : nativeStorage;

export default storage;
export type { StorageShape };
