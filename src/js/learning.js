import { AnalysisDB } from './db.js';

const SEVERITY_SCORE = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const RECURRING_THRESHOLD = 3;

function uniqueList(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function normalizeStatute(reference = '') {
  return reference.trim();
}

function computeSeveritySummary(defects = []) {
  return defects.reduce(
    (acc, defect) => {
      const key = defect.severity?.toUpperCase() || 'LOW';
      if (!acc[key]) acc[key] = 0;
      acc[key] += 1;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 }
  );
}

function summarizeDocuments({ fileAName, fileBName, fileATypes = [], fileBTypes = [] }) {
  const documents = [];
  if (fileAName) {
    documents.push({ name: fileAName, type: fileATypes?.[0] || '' });
  }
  if (fileBName) {
    documents.push({ name: fileBName, type: fileBTypes?.[0] || '' });
  }
  return documents;
}

function scoreAnalysis(defects = []) {
  if (!defects.length) return 0;
  const total = defects.reduce((sum, defect) => sum + (SEVERITY_SCORE[defect.severity?.toUpperCase()] || 0), 0);
  return total / defects.length;
}

function splitAnalyses(analyses) {
  if (analyses.length < 4) {
    return { early: analyses.slice(0, Math.ceil(analyses.length / 2)), recent: analyses.slice(-Math.ceil(analyses.length / 2)) };
  }
  const midpoint = Math.floor(analyses.length / 2);
  return { early: analyses.slice(0, midpoint), recent: analyses.slice(midpoint) };
}

async function updateDefectPattern(defect, timestamp) {
  const normalizedStatutes = uniqueList([normalizeStatute(defect.statute)]);
  const existing = await AnalysisDB.getPatternByDefectType(defect.defect_type);

  if (existing) {
    existing.occurrence_count = (existing.occurrence_count || 0) + 1;
    existing.last_seen = timestamp;
    existing.associated_statutes = uniqueList([...(existing.associated_statutes || []), ...normalizedStatutes]);
    existing.description = defect.description || existing.description;
    existing.recommendation = defect.recommendation || existing.recommendation;
    await AnalysisDB.updateDefectPattern(existing);
    return existing;
  }

  const created = {
    defect_type: defect.defect_type,
    description: defect.description || '',
    first_seen: timestamp,
    last_seen: timestamp,
    occurrence_count: 1,
    associated_statutes: normalizedStatutes,
    recommendation: defect.recommendation || '',
  };

  const patternId = await AnalysisDB.saveDefectPattern(created);
  created.pattern_id = patternId;
  return created;
}

async function updateStatutoryReference(defect, timestamp, totalAnalyses) {
  const reference = normalizeStatute(defect.statute);
  if (!reference) return null;

  const existing = await AnalysisDB.getStatute(reference);
  const record = existing || {
    reference,
    statute_name: defect.statute_name || reference,
    times_encountered: 0,
    associated_defects: [],
    compliance_rate: 1,
    last_seen: null,
  };

  record.times_encountered += 1;
  record.last_seen = timestamp;
  record.associated_defects = uniqueList([...record.associated_defects, defect.defect_type]);
  const denominator = Math.max(totalAnalyses, 1);
  const compliance = 1 - record.times_encountered / denominator;
  record.compliance_rate = Number.parseFloat(compliance.toFixed(3));

  if (record.created_at === undefined) {
    record.created_at = timestamp;
  }

  if (existing) {
    await AnalysisDB.updateStatute(record);
  } else {
    await AnalysisDB.saveStatute(record);
  }

  return record;
}

function classifyTemporalTrend(earlyScore, recentScore) {
  if (!Number.isFinite(earlyScore) || !Number.isFinite(recentScore)) return { trend: 'insufficient-data', delta: 0 };
  const delta = earlyScore - recentScore;
  if (Math.abs(delta) < 0.05) {
    return { trend: 'stable', delta };
  }
  if (delta > 0) {
    return { trend: 'improving', delta };
  }
  return { trend: 'worsening', delta };
}

export class LearningEngine {
  static async initialize() {
    await AnalysisDB.init();
  }

  static async recordAnalysis(analysis) {
    const timestamp = new Date().toISOString();
    const severity_summary = computeSeveritySummary(analysis.defects || []);
    const record = {
      ...analysis,
      timestamp,
      severity_summary,
      documents: summarizeDocuments(analysis),
    };

    const id = await AnalysisDB.saveAnalysisRecord(record);
    record.id = id;

    const totalAnalyses = await AnalysisDB.countAnalyses();
    const defectPatterns = [];
    const statuteUpdates = [];

    for (const defect of analysis.defects || []) {
      const pattern = await updateDefectPattern(defect, timestamp);
      defectPatterns.push(pattern);
      const statuteUpdate = await updateStatutoryReference(defect, timestamp, totalAnalyses);
      if (statuteUpdate) statuteUpdates.push(statuteUpdate);
    }

    const crossAnalysis = await this.buildCrossAnalysisIntel(analysis.defects || []);

    return {
      record,
      defectPatterns,
      statuteUpdates,
      crossAnalysis,
    };
  }

  static async buildCrossAnalysisIntel(defects) {
    const patterns = await AnalysisDB.getAllDefectPatterns();
    const intel = {
      recurring: [],
      seenBefore: [],
      novel: [],
    };

    const patternMap = new Map(patterns.map((pattern) => [pattern.defect_type, pattern]));

    for (const defect of defects) {
      const pattern = patternMap.get(defect.defect_type);
      if (!pattern) {
        intel.novel.push({ defect, occurrences: 0 });
        continue;
      }

      const occurrences = pattern.occurrence_count || 0;
      const entry = {
        defect,
        occurrences,
        first_seen: pattern.first_seen,
        last_seen: pattern.last_seen,
        recommendation: pattern.recommendation,
      };

      if (occurrences >= RECURRING_THRESHOLD) {
        intel.recurring.push(entry);
      } else if (occurrences > 1) {
        intel.seenBefore.push(entry);
      } else {
        intel.novel.push(entry);
      }
    }

    intel.recurring.sort((a, b) => b.occurrences - a.occurrences);
    intel.seenBefore.sort((a, b) => b.occurrences - a.occurrences);

    return intel;
  }

  static async getTimelineData(filters = {}) {
    const analyses = await AnalysisDB.getAllAnalyses();
    const filterFns = [];

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      filterFns.push((record) => new Date(record.timestamp).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      filterFns.push((record) => new Date(record.timestamp).getTime() <= end);
    }

    if (filters.statute) {
      filterFns.push((record) => (record.defects || []).some((defect) => normalizeStatute(defect.statute) === filters.statute));
    }

    if (filters.defectType) {
      filterFns.push((record) => (record.defects || []).some((defect) => defect.defect_type === filters.defectType));
    }

    if (filters.severity) {
      filterFns.push((record) => (record.defects || []).some((defect) => defect.severity === filters.severity));
    }

    if (filters.documentType) {
      filterFns.push((record) => (record.documentTypes || []).includes(filters.documentType));
    }

    const filtered = analyses
      .map((record) => ({ ...record, documentTypes: record.documentTypes || this.extractDocumentTypes(record) }))
      .filter((record) => filterFns.every((fn) => fn(record)));

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return filtered;
  }

  static extractDocumentTypes(record) {
    const types = [];
    if (record.fileATypes && record.fileATypes.length) types.push(...record.fileATypes);
    if (record.fileBTypes && record.fileBTypes.length) types.push(...record.fileBTypes);
    return uniqueList(types);
  }

  static async getFilterOptions() {
    const analyses = await AnalysisDB.getAllAnalyses();
    const statutes = new Set();
    const defects = new Set();
    const documentTypes = new Set();

    analyses.forEach((record) => {
      (record.defects || []).forEach((defect) => {
        if (defect.statute) statutes.add(normalizeStatute(defect.statute));
        if (defect.defect_type) defects.add(defect.defect_type);
      });
      this.extractDocumentTypes(record).forEach((type) => documentTypes.add(type));
    });

    return {
      statutes: Array.from(statutes).filter(Boolean).sort(),
      defects: Array.from(defects).filter(Boolean).sort(),
      documentTypes: Array.from(documentTypes).filter(Boolean).sort(),
    };
  }

  static async generatePatternHighlights() {
    const patterns = await AnalysisDB.getAllDefectPatterns();
    const recurring = patterns.filter((pattern) => (pattern.occurrence_count || 0) >= RECURRING_THRESHOLD);
    recurring.sort((a, b) => (b.occurrence_count || 0) - (a.occurrence_count || 0));

    const statutes = await AnalysisDB.getAllStatutes();
    statutes.sort((a, b) => (b.times_encountered || 0) - (a.times_encountered || 0));

    return { patterns, recurring, statutes };
  }

  static async generateInsights(latestAnalysis = null) {
    const analyses = await AnalysisDB.getAllAnalyses();
    const totalAnalyses = analyses.length;
    const totalDefects = analyses.reduce((sum, record) => sum + (record.defects?.length || 0), 0);
    const allDefects = analyses.flatMap((record) => record.defects || []);

    const defectFrequency = new Map();
    allDefects.forEach((defect) => {
      defectFrequency.set(defect.defect_type, (defectFrequency.get(defect.defect_type) || 0) + 1);
    });

    const mostCommonIssue = Array.from(defectFrequency.entries()).sort((a, b) => b[1] - a[1])[0] || null;

    const { early, recent } = splitAnalyses(analyses);
    const earlyScore = early.length ? early.reduce((sum, record) => sum + scoreAnalysis(record.defects), 0) / early.length : 0;
    const recentScore = recent.length ? recent.reduce((sum, record) => sum + scoreAnalysis(record.defects), 0) / recent.length : 0;
    const { trend, delta } = classifyTemporalTrend(earlyScore, recentScore);
    const improvement = trend === 'improving' ? Math.max(delta / (earlyScore || 1), 0) * 100 : trend === 'worsening' ? -Math.abs(delta / (earlyScore || 1)) * 100 : 0;

    const patternHighlights = await this.generatePatternHighlights();
    const novelIssues = (latestAnalysis?.crossAnalysis?.novel || []).length;

    return {
      totalAnalyses,
      totalDefects,
      mostCommonIssue: mostCommonIssue
        ? {
            defectType: mostCommonIssue[0],
            occurrences: mostCommonIssue[1],
          }
        : null,
      complianceTrend: {
        trend,
        delta,
        improvement: improvement,
      },
      newIssues: novelIssues,
      patternHighlights,
    };
  }

  static async hasAnalyses() {
    const count = await AnalysisDB.countAnalyses();
    return count > 0;
  }
}
