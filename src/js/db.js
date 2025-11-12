const DB_NAME = 'complianceLearningDB';
const DB_VERSION = 1;
const STORES = {
  ANALYSES: 'analyses',
  DEFECT_PATTERNS: 'defect_patterns',
  STATUTES: 'statutory_references',
};

const hasIndexedDB = typeof indexedDB !== 'undefined';

function createIndexedDBAdapter() {
  let openRequest = null;

  function createObjectStores(db) {
    if (!db.objectStoreNames.contains(STORES.ANALYSES)) {
      const analyses = db.createObjectStore(STORES.ANALYSES, { keyPath: 'id', autoIncrement: true });
      analyses.createIndex('timestamp', 'timestamp', { unique: false });
      analyses.createIndex('defect_type', 'defects[*].defect_type', { unique: false });
      analyses.createIndex('statute', 'defects[*].statute', { unique: false });
    }

    if (!db.objectStoreNames.contains(STORES.DEFECT_PATTERNS)) {
      const patterns = db.createObjectStore(STORES.DEFECT_PATTERNS, { keyPath: 'pattern_id', autoIncrement: true });
      patterns.createIndex('defect_type', 'defect_type', { unique: true });
    }

    if (!db.objectStoreNames.contains(STORES.STATUTES)) {
      const statutes = db.createObjectStore(STORES.STATUTES, { keyPath: 'reference' });
      statutes.createIndex('times_encountered', 'times_encountered', { unique: false });
    }
  }

  function openDatabase() {
    if (openRequest) {
      return openRequest;
    }

    openRequest = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        createObjectStores(db);
      };
    });

    return openRequest;
  }

  function runTransaction(storeName, mode, callback) {
    return openDatabase().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, mode);
          const store = tx.objectStore(storeName);
          const request = callback(store, tx);

          tx.oncomplete = () => {
            resolve(request && request.result !== undefined ? request.result : undefined);
          };

          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new DOMException('Transaction aborted'));
        })
    );
  }

  return {
    init() {
      return openDatabase();
    },

    async saveAnalysisRecord(record) {
      return runTransaction(STORES.ANALYSES, 'readwrite', (store) => store.add(record));
    },

    async updateAnalysisRecord(record) {
      return runTransaction(STORES.ANALYSES, 'readwrite', (store) => store.put(record));
    },

    async getAnalysisById(id) {
      return runTransaction(STORES.ANALYSES, 'readonly', (store) => store.get(id));
    },

    async getAllAnalyses() {
      return openDatabase().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.ANALYSES, 'readonly');
            const store = tx.objectStore(STORES.ANALYSES);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
          })
      );
    },

    async countAnalyses() {
      return runTransaction(STORES.ANALYSES, 'readonly', (store) => store.count());
    },

    async getAllDefectPatterns() {
      return runTransaction(STORES.DEFECT_PATTERNS, 'readonly', (store) => store.getAll());
    },

    async getPatternByDefectType(defectType) {
      return openDatabase().then(
        (db) =>
          new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.DEFECT_PATTERNS, 'readonly');
            const store = tx.objectStore(STORES.DEFECT_PATTERNS);
            const index = store.index('defect_type');
            const request = index.get(defectType);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
          })
      );
    },

    async saveDefectPattern(pattern) {
      return runTransaction(STORES.DEFECT_PATTERNS, 'readwrite', (store) => store.add(pattern));
    },

    async updateDefectPattern(pattern) {
      return runTransaction(STORES.DEFECT_PATTERNS, 'readwrite', (store) => store.put(pattern));
    },

    async getAllStatutes() {
      return runTransaction(STORES.STATUTES, 'readonly', (store) => store.getAll());
    },

    async getStatute(reference) {
      return runTransaction(STORES.STATUTES, 'readonly', (store) => store.get(reference));
    },

    async saveStatute(record) {
      return runTransaction(STORES.STATUTES, 'readwrite', (store) => store.add(record));
    },

    async updateStatute(record) {
      return runTransaction(STORES.STATUTES, 'readwrite', (store) => store.put(record));
    },

    async clearAll() {
      return Promise.all([
        runTransaction(STORES.ANALYSES, 'readwrite', (store) => store.clear()),
        runTransaction(STORES.DEFECT_PATTERNS, 'readwrite', (store) => store.clear()),
        runTransaction(STORES.STATUTES, 'readwrite', (store) => store.clear()),
      ]);
    },
  };
}

function clone(value) {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function createMemoryAdapter() {
  const state = {
    analyses: [],
    defectPatterns: [],
    statutes: [],
  };

  let analysisId = 1;
  let patternId = 1;

  function findIndex(list, predicate) {
    for (let i = 0; i < list.length; i += 1) {
      if (predicate(list[i])) {
        return i;
      }
    }
    return -1;
  }

  return {
    async init() {
      return Promise.resolve();
    },

    async saveAnalysisRecord(record) {
      const stored = clone(record);
      stored.id = analysisId++;
      state.analyses.push(stored);
      return stored.id;
    },

    async updateAnalysisRecord(record) {
      const index = findIndex(state.analyses, (item) => item.id === record.id);
      if (index >= 0) {
        state.analyses[index] = clone(record);
      }
      return record.id;
    },

    async getAnalysisById(id) {
      const item = state.analyses.find((analysis) => analysis.id === id);
      return clone(item || null);
    },

    async getAllAnalyses() {
      return clone(state.analyses);
    },

    async countAnalyses() {
      return state.analyses.length;
    },

    async getAllDefectPatterns() {
      return clone(state.defectPatterns);
    },

    async getPatternByDefectType(defectType) {
      const item = state.defectPatterns.find((pattern) => pattern.defect_type === defectType);
      return clone(item || null);
    },

    async saveDefectPattern(pattern) {
      const stored = clone(pattern);
      stored.pattern_id = patternId++;
      state.defectPatterns.push(stored);
      return stored.pattern_id;
    },

    async updateDefectPattern(pattern) {
      const index = findIndex(state.defectPatterns, (item) => item.pattern_id === pattern.pattern_id);
      if (index >= 0) {
        state.defectPatterns[index] = clone(pattern);
      }
      return pattern.pattern_id;
    },

    async getAllStatutes() {
      return clone(state.statutes);
    },

    async getStatute(reference) {
      const statute = state.statutes.find((item) => item.reference === reference);
      return clone(statute || null);
    },

    async saveStatute(record) {
      state.statutes.push(clone(record));
      return record.reference;
    },

    async updateStatute(record) {
      const index = findIndex(state.statutes, (item) => item.reference === record.reference);
      if (index >= 0) {
        state.statutes[index] = clone(record);
      } else {
        state.statutes.push(clone(record));
      }
      return record.reference;
    },

    async clearAll() {
      state.analyses = [];
      state.defectPatterns = [];
      state.statutes = [];
      analysisId = 1;
      patternId = 1;
    },
  };
}

export const AnalysisDB = hasIndexedDB ? createIndexedDBAdapter() : createMemoryAdapter();

export function serializeForDisplay(value) {
  return JSON.stringify(value, null, 2);
}
