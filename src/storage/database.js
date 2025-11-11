import { normalizeStatuteReference, unionArray } from "../utils/helpers.js";

const DB_NAME = "analysis_learning_db";
const DB_VERSION = 1;
let dbPromise;

export function initializeDatabase() {
  return openDatabase().then(() => undefined);
}

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains("analyses")) {
        const analysesStore = db.createObjectStore("analyses", {
          keyPath: "id",
          autoIncrement: true,
        });
        analysesStore.createIndex("timestamp", "timestamp", { unique: false });
        analysesStore.createIndex("fileAName", "fileAName", { unique: false });
        analysesStore.createIndex("fileBName", "fileBName", { unique: false });
      }

      if (!db.objectStoreNames.contains("defect_patterns")) {
        const patternsStore = db.createObjectStore("defect_patterns", {
          keyPath: "pattern_id",
          autoIncrement: true,
        });
        patternsStore.createIndex("defect_type", "defect_type", { unique: true });
      }

      if (!db.objectStoreNames.contains("statutory_references")) {
        const statuteStore = db.createObjectStore("statutory_references", {
          keyPath: "reference",
        });
        statuteStore.createIndex("compliance_rate", "compliance_rate", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
  });
}

export async function saveAnalysisRecord(record) {
  const db = await openDatabase();
  const tx = db.transaction(["analyses"], "readwrite");
  const store = tx.objectStore("analyses");
  const completion = transactionComplete(tx);
  const request = store.add(record);
  request.onsuccess = (event) => {
    record.id = event.target.result;
  };
  await completion;
  return record;
}

export async function updateDefectPatterns(defects = [], timestamp) {
  if (!defects?.length) return [];
  const db = await openDatabase();
  const tx = db.transaction(["defect_patterns"], "readwrite");
  const store = tx.objectStore("defect_patterns");
  const completion = transactionComplete(tx);
  const updates = [];

  for (const defect of defects) {
    const normalizedType = defect.defectType || defect.type || "Unclassified";
    const indexRequest = store.index("defect_type").get(normalizedType);
    const existing = await promisifyRequest(indexRequest).catch(() => undefined);
    const statutes = (defect.statutes || []).map((statute) =>
      typeof statute === "string" ? statute : statute.reference || statute.name || ""
    );

    if (existing) {
      existing.occurrence_count = (existing.occurrence_count || 0) + 1;
      existing.last_seen = timestamp;
      existing.description = existing.description || defect.description || "";
      existing.associated_statutes = unionArray(existing.associated_statutes || [], statutes);
      if (defect.recommendation && defect.recommendation.trim()) {
        existing.recommendation = defect.recommendation;
      }
      await promisifyRequest(store.put(existing));
      updates.push(existing);
    } else {
      const patternRecord = {
        defect_type: normalizedType,
        description: defect.description || "",
        first_seen: timestamp,
        last_seen: timestamp,
        occurrence_count: 1,
        associated_statutes: statutes.filter(Boolean),
        recommendation: defect.recommendation || generateFallbackRecommendation(normalizedType),
      };
      const addRequest = store.add(patternRecord);
      const key = await promisifyRequest(addRequest);
      patternRecord.pattern_id = key;
      updates.push(patternRecord);
    }
  }

  await completion;
  return updates;
}

function generateFallbackRecommendation(defectType) {
  if (!defectType) return "Review procedure and documentation requirements.";
  return `Investigate recurring issue: ${defectType}. Validate workflow ownership, update checklists, and reinforce training to prevent future occurrences.`;
}

export async function updateStatutoryReferences(statuteOutcomes = [], defects = [], timestamp) {
  const db = await openDatabase();
  const tx = db.transaction(["statutory_references"], "readwrite");
  const store = tx.objectStore("statutory_references");
  const completion = transactionComplete(tx);
  const updates = [];

  const defectsByStatute = new Map();
  for (const defect of defects || []) {
    for (const statute of defect.statutes || []) {
      const reference = normalizeStatuteReference(
        typeof statute === "string" ? statute : statute.reference || statute.name
      );
      if (!reference) continue;
      const defectList = defectsByStatute.get(reference) || [];
      defectList.push(defect.defectType || defect.type || "Unclassified");
      defectsByStatute.set(reference, defectList);
    }
  }

  for (const outcome of statuteOutcomes || []) {
    const reference = normalizeStatuteReference(outcome.reference || outcome.statute || outcome.name);
    if (!reference) continue;
    const existingRequest = store.get(reference);
    const existing = await promisifyRequest(existingRequest).catch(() => undefined);

    const currentAssociated = defectsByStatute.get(reference) || [];
    const associatedDefects = outcome.associatedDefects || currentAssociated;

    if (existing) {
      existing.statute_name = outcome.statute_name || existing.statute_name || "";
      existing.times_encountered = (existing.times_encountered || 0) + 1;
      existing.associated_defects = unionArray(existing.associated_defects || [], associatedDefects);
      const compliantCount = existing.compliant_count || 0;
      const nonCompliantCount = existing.non_compliant_count || 0;
      if (outcome.compliant) {
        existing.compliant_count = compliantCount + 1;
      } else {
        existing.non_compliant_count = nonCompliantCount + 1;
      }
      const total = (existing.compliant_count || 0) + (existing.non_compliant_count || 0);
      existing.compliance_rate = total ? (existing.compliant_count || 0) / total : 1;
      existing.last_seen = timestamp;
      await promisifyRequest(store.put(existing));
      updates.push(existing);
    } else {
      const compliantCount = outcome.compliant ? 1 : 0;
      const nonCompliantCount = outcome.compliant ? 0 : 1;
      const record = {
        reference,
        statute_name: outcome.statute_name || outcome.name || "",
        times_encountered: 1,
        associated_defects: associatedDefects,
        compliance_rate: compliantCount ? 1 : 0,
        compliant_count: compliantCount,
        non_compliant_count: nonCompliantCount,
        first_seen: timestamp,
        last_seen: timestamp,
      };
      await promisifyRequest(store.add(record));
      updates.push(record);
    }
  }

  await completion;
  return updates;
}

export async function getAllAnalyses() {
  const db = await openDatabase();
  const tx = db.transaction(["analyses"], "readonly");
  const store = tx.objectStore("analyses");
  const completion = transactionComplete(tx);
  const request = store.getAll();
  const result = await promisifyRequest(request);
  await completion;
  return result;
}

export async function getAllDefectPatterns() {
  const db = await openDatabase();
  const tx = db.transaction(["defect_patterns"], "readonly");
  const store = tx.objectStore("defect_patterns");
  const completion = transactionComplete(tx);
  const request = store.getAll();
  const result = await promisifyRequest(request);
  await completion;
  return result;
}

export async function getAllStatutoryReferences() {
  const db = await openDatabase();
  const tx = db.transaction(["statutory_references"], "readonly");
  const store = tx.objectStore("statutory_references");
  const completion = transactionComplete(tx);
  const request = store.getAll();
  const result = await promisifyRequest(request);
  await completion;
  return result;
}

export async function clearDatabase() {
  const db = await openDatabase();
  const tx = db.transaction(
    ["analyses", "defect_patterns", "statutory_references"],
    "readwrite"
  );
  const completion = transactionComplete(tx);
  tx.objectStore("analyses").clear();
  tx.objectStore("defect_patterns").clear();
  tx.objectStore("statutory_references").clear();
  await completion;
}
