import {
  initializeDatabase,
  saveAnalysisRecord,
  updateDefectPatterns,
  updateStatutoryReferences,
  getAllAnalyses,
  getAllDefectPatterns,
  getAllStatutoryReferences,
  clearDatabase,
} from "../storage/database.js";
import {
  average,
  clone,
  formatDate,
  normalizeStatuteReference,
  severityScore,
  sortByTimestampAscending,
  sortByTimestampDescending,
  unionArray,
} from "../utils/helpers.js";

const RECURRENCE_THRESHOLD = 3;

export class LearningEngine {
  constructor() {
    this.cachedAnalyses = [];
    this.cachedPatterns = [];
    this.cachedStatutes = [];
    this.currentAnalysis = null;
    this.currentIntelligence = null;
    this.listeners = new Map();
  }

  async initialize() {
    await initializeDatabase();
    await this.refreshCaches();
  }

  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    const listeners = this.listeners.get(eventName);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(eventName, payload) {
    const listeners = this.listeners.get(eventName);
    if (!listeners) return;
    for (const callback of listeners) {
      callback(payload);
    }
  }

  async recordAnalysis(analysisResult) {
    const analysisRecord = clone(analysisResult);
    analysisRecord.timestamp = analysisRecord.timestamp || new Date().toISOString();
    const saved = await saveAnalysisRecord(analysisRecord);
    await updateDefectPatterns(saved.defects || [], saved.timestamp);
    const statuteOutcomes = saved.findings?.phaseB?.unresolvedStatutes
      ? buildStatuteOutcomeList(saved)
      : saved.findings?.statuteOutcomes || [];
    await updateStatutoryReferences(statuteOutcomes, saved.defects || [], saved.timestamp);
    await this.refreshCaches();
    this.currentAnalysis = saved;
    this.currentIntelligence = this.buildCrossAnalysisIntelligence(saved);
    this.emit("analysis-recorded", { analysis: saved });
    this.emit("data-updated", this.getSnapshot());
    return saved;
  }

  async refreshCaches() {
    this.cachedAnalyses = sortByTimestampDescending(await getAllAnalyses());
    this.cachedPatterns = await getAllDefectPatterns();
    this.cachedStatutes = await getAllStatutoryReferences();
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      analyses: clone(this.cachedAnalyses),
      patterns: clone(this.cachedPatterns),
      statutes: clone(this.cachedStatutes),
      currentAnalysis: clone(this.currentAnalysis),
      currentIntelligence: clone(this.currentIntelligence),
    };
  }

  getCurrentAnalysis() {
    return clone(this.currentAnalysis);
  }

  getCurrentIntelligence() {
    return clone(this.currentIntelligence);
  }

  async reset() {
    await clearDatabase();
    this.cachedAnalyses = [];
    this.cachedPatterns = [];
    this.cachedStatutes = [];
    this.currentAnalysis = null;
    this.currentIntelligence = null;
    this.emit("data-updated", this.getSnapshot());
  }

  getAnalyses(filters = {}) {
    const analyses = this.cachedAnalyses || [];
    return analyses.filter((analysis) => this.applyFilters(analysis, filters));
  }

  getAnalysisById(id) {
    return (this.cachedAnalyses || []).find((analysis) => analysis.id === id) || null;
  }

  getPatterns() {
    return clone(this.cachedPatterns);
  }

  getStatutes() {
    return clone(this.cachedStatutes);
  }

  applyFilters(analysis, filters) {
    const { startDate, endDate, statute, defectType, severity, documentType } = filters;

    if (startDate) {
      const analysisDate = formatDate(analysis.timestamp);
      if (analysisDate < startDate) return false;
    }

    if (endDate) {
      const analysisDate = formatDate(analysis.timestamp);
      if (analysisDate > endDate) return false;
    }

    if (statute) {
      const normalized = normalizeStatuteReference(statute);
      const matches = (analysis.defects || []).some((defect) =>
        (defect.statutes || []).some(
          (statuteRef) => normalizeStatuteReference(statuteRef.reference) === normalized
        )
      );
      if (!matches) return false;
    }

    if (defectType) {
      const matches = (analysis.defects || []).some(
        (defect) => defect.defectType?.toLowerCase().includes(defectType.toLowerCase())
      );
      if (!matches) return false;
    }

    if (severity) {
      const severityKey = severity.toUpperCase();
      const summary = analysis.severity_summary || {};
      if (!summary[severityKey]) return false;
    }

    if (documentType) {
      const type = documentType.toLowerCase();
      const fileAType = (analysis.fileAName || "").toLowerCase();
      const fileBType = (analysis.fileBName || "").toLowerCase();
      if (!fileAType.includes(type) && !fileBType.includes(type)) {
        return false;
      }
    }

    return true;
  }

  buildCrossAnalysisIntelligence(analysis) {
    if (!analysis) return null;
    const patternsMap = new Map(
      (this.cachedPatterns || []).map((pattern) => [pattern.defect_type, pattern])
    );
    const intelligenceItems = (analysis.defects || []).map((defect) => {
      const pattern = patternsMap.get(defect.defectType);
      const previous = (this.cachedAnalyses || []).filter(
        (candidate) =>
          candidate.id !== analysis.id &&
          (candidate.defects || []).some((item) => item.defectType === defect.defectType)
      );
      const occurrences = pattern?.occurrence_count || (previous.length ? previous.length + 1 : 1);
      const isRecurring = occurrences >= RECURRENCE_THRESHOLD;
      const recommendation = defect.recommendation || pattern?.recommendation;
      return {
        defectType: defect.defectType,
        description: defect.description,
        severity: defect.severity,
        statutes: defect.statutes,
        seenBefore: Boolean(previous.length),
        occurrences,
        isRecurring,
        recommendation,
        pattern,
        previousAnalyses: previous.map((item) => ({
          id: item.id,
          timestamp: item.timestamp,
          fileAName: item.fileAName,
          fileBName: item.fileBName,
          severitySummary: item.severity_summary,
        })),
      };
    });

    const novelIssues = intelligenceItems
      .filter((item) => !item.seenBefore)
      .map((item) => item.defectType);

    return {
      items: intelligenceItems,
      novelIssues,
      recurring: intelligenceItems.filter((item) => item.isRecurring),
    };
  }

  computeGlobalInsights() {
    const totalAnalyses = this.cachedAnalyses.length;
    const totalDefects = this.cachedAnalyses.reduce(
      (count, analysis) => count + (analysis.defects?.length || 0),
      0
    );
    const mostCommonIssue = this.cachedPatterns.reduce(
      (top, pattern) => {
        if (!top || pattern.occurrence_count > top.occurrence_count) {
          return pattern;
        }
        return top;
      },
      null
    );
    const recurringPatterns = this.cachedPatterns.filter(
      (pattern) => (pattern.occurrence_count || 0) >= RECURRENCE_THRESHOLD
    );

    const complianceTrend = this.computeComplianceTrend();
    const temporalTrends = this.computeTemporalTrends();
    const statuteInsights = this.computeStatuteInsights();
    const novelCount = this.currentIntelligence?.novelIssues?.length || 0;
    const recommendedImprovements = recurringPatterns
      .map((pattern) => pattern.recommendation)
      .filter(Boolean);

    return {
      totalAnalyses,
      totalDefects,
      mostCommonIssue: mostCommonIssue
        ? {
            type: mostCommonIssue.defect_type,
            occurrences: mostCommonIssue.occurrence_count,
          }
        : null,
      complianceTrend,
      temporalTrends,
      statuteInsights,
      recurringPatterns,
      novelIssueCount: novelCount,
      recommendedImprovements,
    };
  }

  computeComplianceTrend() {
    if (!this.cachedAnalyses.length) {
      return {
        baseline: 0,
        recent: 0,
        delta: 0,
      };
    }

    const complianceByAnalysis = this.cachedAnalyses
      .map((analysis) => {
        const outcomes = buildStatuteOutcomeList(analysis);
        if (!outcomes.length) return null;
        const compliantCount = outcomes.filter((outcome) => outcome.compliant).length;
        const complianceRate = compliantCount / outcomes.length;
        return {
          timestamp: analysis.timestamp,
          complianceRate,
        };
      })
      .filter(Boolean);

    if (!complianceByAnalysis.length) {
      return {
        baseline: 0,
        recent: 0,
        delta: 0,
      };
    }

    const chronological = sortByTimestampAscending(complianceByAnalysis);
    const halfIndex = Math.max(1, Math.floor(chronological.length / 2));
    const historical = chronological.slice(0, halfIndex);
    const recent = chronological.slice(halfIndex);

    const baseline = average(historical.map((item) => item.complianceRate));
    const recentAvg = average(recent.map((item) => item.complianceRate));

    return {
      baseline,
      recent: recentAvg,
      delta: recentAvg - baseline,
    };
  }

  computeTemporalTrends() {
    if (this.cachedAnalyses.length < 2) {
      return {
        trend: "stable",
        narrative: "Insufficient data to determine temporal trend.",
        emergingIssues: [],
      };
    }

    const chronological = sortByTimestampAscending(this.cachedAnalyses);
    const severityScores = chronological.map((analysis) => {
      const summary = analysis.severity_summary || {};
      const total = (summary.HIGH || 0) + (summary.MEDIUM || 0) + (summary.LOW || 0);
      if (!total) return null;
      const weighted =
        (summary.HIGH || 0) * severityScore("HIGH") +
        (summary.MEDIUM || 0) * severityScore("MEDIUM") +
        (summary.LOW || 0) * severityScore("LOW");
      return {
        timestamp: analysis.timestamp,
        score: weighted / total,
      };
    }).filter(Boolean);

    if (!severityScores.length) {
      return {
        trend: "stable",
        narrative: "Severity distribution remains unchanged across analyses.",
        emergingIssues: [],
      };
    }

    const halfIndex = Math.max(1, Math.floor(severityScores.length / 2));
    const historical = severityScores.slice(0, halfIndex);
    const recent = severityScores.slice(halfIndex);

    const baseline = average(historical.map((item) => item.score));
    const recentAvg = average(recent.map((item) => item.score));
    const delta = recentAvg - baseline;

    let trend = "stable";
    if (delta > 0.1) {
      trend = "worsening";
    } else if (delta < -0.1) {
      trend = "improving";
    }

    const latestAnalysis = chronological[chronological.length - 1];
    const previousDefectTypes = new Set(
      chronological
        .slice(0, -1)
        .flatMap((analysis) => analysis.defects?.map((defect) => defect.defectType) || [])
    );
    const emergingIssues = (latestAnalysis.defects || [])
      .map((defect) => defect.defectType)
      .filter((type) => type && !previousDefectTypes.has(type));

    const narrative =
      trend === "improving"
        ? "Recent analyses show lower weighted severity than historical baseline."
        : trend === "worsening"
        ? "Weighted severity has increased relative to historical average, indicating emerging risk."
        : "Severity profile aligns with historical average.";

    return {
      trend,
      delta,
      narrative,
      emergingIssues,
    };
  }

  computeStatuteInsights() {
    if (!this.cachedStatutes.length) {
      return {
        highestDefectRate: [],
        complianceLeaders: [],
      };
    }

    const ranked = [...this.cachedStatutes]
      .map((statute) => ({
        ...statute,
        defectRate: 1 - (statute.compliance_rate || 0),
      }))
      .sort((a, b) => b.defectRate - a.defectRate);

    const highestDefectRate = ranked.slice(0, 3);
    const complianceLeaders = [...ranked]
      .sort((a, b) => (b.compliance_rate || 0) - (a.compliance_rate || 0))
      .slice(0, 3);

    return {
      highestDefectRate,
      complianceLeaders,
    };
  }

  getTimelineData(filters = {}) {
    return this.getAnalyses(filters);
  }

  getFilterOptions() {
    const statutes = new Set();
    const defectTypes = new Set();
    const documentTypes = new Set();

    for (const analysis of this.cachedAnalyses) {
      for (const defect of analysis.defects || []) {
        defectTypes.add(defect.defectType);
        for (const statute of defect.statutes || []) {
          statutes.add(statute.reference);
        }
      }
      if (analysis.fileAName) documentTypes.add(analysis.fileAName.split(".").pop());
      if (analysis.fileBName) documentTypes.add(analysis.fileBName.split(".").pop());
    }

    return {
      statutes: [...statutes].filter(Boolean),
      defectTypes: [...defectTypes].filter(Boolean),
      documentTypes: [...documentTypes].filter(Boolean),
    };
  }

  async importAnalyses(samples = []) {
    for (const sample of samples) {
      await this.recordAnalysis(sample);
    }
  }
}

function buildStatuteOutcomeList(analysis) {
  if (analysis.findings?.statuteOutcomes) {
    return analysis.findings.statuteOutcomes;
  }
  const phaseB = analysis.findings?.phaseB;
  if (!phaseB) return [];
  return (phaseB.unresolvedStatutes || []).map((outcome) => ({
    reference: outcome.reference,
    statute_name: outcome.statute_name,
    compliant: false,
    associatedDefects: outcome.associatedDefects || [],
  }));
}
