import { escapeHtml } from "../utils/helpers.js";

export class LearningInsightsPanel {
  constructor(container, engine) {
    this.container = container;
    this.engine = engine;
    this.engine.on("data-updated", () => this.render());
    this.render();
  }

  render() {
    if (!this.container) return;
    const insights = this.engine.computeGlobalInsights();
    if (!insights) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h3>📊 System Intelligence Summary</h3>
          <p>No analyses recorded yet.</p>
        </div>
      `;
      return;
    }

    const complianceDelta = insights.complianceTrend.delta * 100;
    const complianceText = `${(insights.complianceTrend.recent * 100).toFixed(1)}%`;
    const baselineText = `${(insights.complianceTrend.baseline * 100).toFixed(1)}%`;

    const recurringHtml = insights.recurringPatterns
      .map(
        (pattern) => `
          <li>
            <strong>${escapeHtml(pattern.defect_type)}</strong> · ${pattern.occurrence_count} occurrences
            <p>${escapeHtml(pattern.recommendation || "Review and address.")}</p>
          </li>
        `
      )
      .join("") || "<li>No recurring patterns yet.</li>";

    const statuteRiskHtml = insights.statuteInsights.highestDefectRate
      .map((statute) => `
        <li>
          <strong>${escapeHtml(statute.reference)}</strong> · ${(statute.compliance_rate * 100).toFixed(0)}% compliance
          <p>Associated defects: ${escapeHtml((statute.associated_defects || []).join(", ") || "None recorded")}</p>
        </li>
      `)
      .join("") || "<li>No statutory risk differentials yet.</li>";

    const improvementsHtml = insights.recommendedImprovements.length
      ? insights.recommendedImprovements
          .map((improvement) => `<li>${escapeHtml(improvement)}</li>`)
          .join("")
      : "<li>No process improvements identified yet.</li>";

    const emergingHtml = insights.temporalTrends.emergingIssues.length
      ? insights.temporalTrends.emergingIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")
      : "<li>No emerging issues detected.</li>";

    const mostCommon = insights.mostCommonIssue
      ? `${escapeHtml(insights.mostCommonIssue.type)} (${insights.mostCommonIssue.occurrences} occurrences)`
      : "Not yet determined";

    this.container.innerHTML = `
      <h3>📊 System Intelligence Summary</h3>
      <div class="insights-grid">
        <div class="metric-card">
          <span class="metric-label">Total analyses</span>
          <span class="metric-value">${insights.totalAnalyses}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Total defects</span>
          <span class="metric-value">${insights.totalDefects}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Most common issue</span>
          <span class="metric-value">${mostCommon}</span>
        </div>
        <div class="metric-card ${complianceDelta >= 0 ? "positive" : "danger"}">
          <span class="metric-label">Compliance improvement</span>
          <span class="metric-value">${complianceText}</span>
          <small>Baseline ${baselineText} (${complianceDelta >= 0 ? "+" : ""}${complianceDelta.toFixed(1)} pts)</small>
        </div>
        <div class="metric-card">
          <span class="metric-label">New issues this analysis</span>
          <span class="metric-value">${insights.novelIssueCount}</span>
        </div>
      </div>

      <section class="insights-section">
        <h4>Recurring Patterns</h4>
        <ul class="insights-list">${recurringHtml}</ul>
      </section>

      <section class="insights-section">
        <h4>Statutory Risk Concentrations</h4>
        <ul class="insights-list">${statuteRiskHtml}</ul>
      </section>

      <section class="insights-section">
        <h4>Emerging Issues</h4>
        <p>${insights.temporalTrends.narrative}</p>
        <ul class="insights-list">${emergingHtml}</ul>
      </section>

      <section class="insights-section">
        <h4>Recommended Process Improvements</h4>
        <ul class="insights-list">${improvementsHtml}</ul>
      </section>
    `;
  }
}
