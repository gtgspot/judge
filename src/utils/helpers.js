const SEVERITY_SCORES = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function escapeHtml(value) {
  return (value ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function severityScore(severity) {
  return SEVERITY_SCORES[severity?.toUpperCase?.()] ?? 0;
}

export function computeSeveritySummary(defects = []) {
  return defects.reduce(
    (acc, defect) => {
      const key = (defect.severity || "LOW").toUpperCase();
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key] += 1;
      acc.total += 1;
      acc.weighted += severityScore(key);
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0, total: 0, weighted: 0 }
  );
}

export function unionArray(current = [], additions = []) {
  const set = new Set(current);
  additions.forEach((item) => {
    if (item != null && item !== "") {
      set.add(item);
    }
  });
  return [...set];
}

export function formatDateTime(isoString) {
  if (!isoString) return "Unknown";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return `${date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function average(numbers = []) {
  if (!numbers.length) return 0;
  const sum = numbers.reduce((acc, value) => acc + value, 0);
  return sum / numbers.length;
}

export function clone(value) {
  return structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function generateId(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function normalizeStatuteReference(rawReference = "") {
  if (!rawReference) return "";
  let normalized = rawReference.trim().toUpperCase();
  normalized = normalized
    .replace(/\bSECTION\b/g, "S.")
    .replace(/\bSEC(TION)?\.?(?=\d)/g, "S.")
    .replace(/\bSUBSECTION\b/g, "S.");
  normalized = normalized.replace(/[^A-Z0-9\.\(\)]/g, "");
  normalized = normalized.replace(
    /(ROADSAFETYACT\d{4}|ROADSAFETYACT|RSA|EVIDENCEACT\d{4}|EVIDENCEACT|CRIMINALPROCEDUREACT\d{4}|CRIMINALPROCEDUREACT)$/,
    ""
  );
  normalized = normalized.replace(/ACT$/, "");
  return normalized;
}

export function sortByTimestampDescending(items = []) {
  return [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function sortByTimestampAscending(items = []) {
  return [...items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}
