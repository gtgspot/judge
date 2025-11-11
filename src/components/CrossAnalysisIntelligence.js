import { escapeHtml, formatDateTime } from "../utils/helpers.js";

export class CrossAnalysisIntelligence {
  constructor(container, engine) {
    this.container = container;
    this.engine = engine;
    this.engine.on("data-updated", () => this.render());
    this.render();
  }

  render() {
    if (!this.container) return;
    const intelligence = this.engine.getCurrentIntelligence();
    if (!intelligence || !intelligence.items?.length) {
      this.container.innerHTML = `
        <div class="empty-state">
          <h3>Cross-Analysis Intelligence</h3>
          <p>Run an analysis to view cross-case insights.</p>
        </div>
      `;
      return;
    }

    const novelCount = intelligence.novelIssues.length;

    const itemsHtml = intelligence.items
      .map((item) => this.renderItem(item))
      .join("");

    this.container.innerHTML = `
      <h3>Cross-Analysis Intelligence</h3>
      <p class="summary-line">${novelCount ? `${novelCount} novel issue${novelCount === 1 ? "" : "s"}` : "No novel issues"} detected in the latest review.</p>
      <div class="cross-analysis-list">
        ${itemsHtml}
      </div>
    `;
  }

  renderItem(item) {
    const statuteBadges = (item.statutes || [])
      .map((statute) => `<span class="badge statute">${escapeHtml(statute.reference)}</span>`)
      .join(" ");
    const recommendation =
      escapeHtml(
        item.recommendation ||
          "Capture remediation actions for this defect and align with training plans."
      );
    const previousHtml = item.previousAnalyses
      .map(
        (analysis) => `
          <li>
            <span>${formatDateTime(analysis.timestamp)}</span>
            <span>${escapeHtml(analysis.fileAName || "Document A")} vs ${escapeHtml(
          analysis.fileBName || "Document B"
        )}</span>
          </li>
        `
      )
      .join("");

    return `
      <article class="cross-analysis-item">
        <header>
          <div>
            <h4>${escapeHtml(item.defectType)}</h4>
            <p>${escapeHtml(item.description || "No description available.")}</p>
          </div>
          <div class="badge-group">
            ${item.isRecurring ? '<span class="badge recurring">Recurring Pattern</span>' : ""}
            ${!item.seenBefore ? '<span class="badge novel">Novel Issue</span>' : ""}
            <span class="badge severity-${item.severity?.toLowerCase?.() || "low"}">${escapeHtml(
              item.severity || "LOW"
            )}</span>
          </div>
        </header>
        <div class="statute-tags">${statuteBadges}</div>
        <p class="recommendation"><strong>Recommendation:</strong> ${recommendation}</p>
        ${item.previousAnalyses.length
          ? `<details>
              <summary>Previously observed (${item.previousAnalyses.length})</summary>
              <ul class="prior-occurrences">${previousHtml}</ul>
            </details>`
          : "<p>No prior occurrences recorded.</p>"}
      </article>
    `;
  }
}
