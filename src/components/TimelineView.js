import { escapeHtml, formatDateTime } from "../utils/helpers.js";

export class TimelineView {
  constructor(container, engine, detailRenderer) {
    this.container = container;
    this.engine = engine;
    this.detailRenderer = detailRenderer;
    this.filtersContainer = document.getElementById("timeline-filters");
    this.filterState = {
      startDate: "",
      endDate: "",
      statute: "",
      defectType: "",
      severity: "",
      documentType: "",
    };
    this.renderFilters();
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.engine.on("data-updated", () => {
      this.renderFilters();
      this.render();
    });
  }

  renderFilters() {
    if (!this.filtersContainer) return;
    const { statutes, defectTypes, documentTypes } = this.engine.getFilterOptions();
    this.filtersContainer.innerHTML = `
      <h3>Filter Timeline</h3>
      <form id="timeline-filter-form">
        <label>
          Start Date
          <input type="date" name="startDate" value="${this.filterState.startDate}" />
        </label>
        <label>
          End Date
          <input type="date" name="endDate" value="${this.filterState.endDate}" />
        </label>
        <label>
          Statute
          <input list="statute-filter-options" name="statute" value="${this.filterState.statute}" placeholder="e.g. s.55D" />
          <datalist id="statute-filter-options">
            ${statutes.map((statute) => `<option value="${escapeHtml(statute)}"></option>`).join("")}
          </datalist>
        </label>
        <label>
          Defect Type
          <input list="defect-filter-options" name="defectType" value="${this.filterState.defectType}" placeholder="e.g. Missing directions" />
          <datalist id="defect-filter-options">
            ${defectTypes.map((type) => `<option value="${escapeHtml(type)}"></option>`).join("")}
          </datalist>
        </label>
        <label>
          Severity
          <select name="severity">
            <option value="">All severities</option>
            <option value="HIGH" ${this.filterState.severity === "HIGH" ? "selected" : ""}>High</option>
            <option value="MEDIUM" ${this.filterState.severity === "MEDIUM" ? "selected" : ""}>Medium</option>
            <option value="LOW" ${this.filterState.severity === "LOW" ? "selected" : ""}>Low</option>
          </select>
        </label>
        <label>
          Document Type
          <input list="document-type-options" name="documentType" value="${this.filterState.documentType}" placeholder="e.g. pdf" />
          <datalist id="document-type-options">
            ${documentTypes.map((type) => `<option value="${escapeHtml(type)}"></option>`).join("")}
          </datalist>
        </label>
        <button type="reset" class="ghost-button">Clear Filters</button>
      </form>
    `;

    const form = this.filtersContainer.querySelector("#timeline-filter-form");
    form.addEventListener("change", (event) => {
      const { name, value } = event.target;
      if (!(name in this.filterState)) return;
      this.filterState[name] = value;
      this.render();
    });
    form.addEventListener("reset", (event) => {
      event.preventDefault();
      this.filterState = {
        startDate: "",
        endDate: "",
        statute: "",
        defectType: "",
        severity: "",
        documentType: "",
      };
      this.renderFilters();
      this.render();
    });
  }

  render() {
    if (!this.container) return;
    const analyses = this.engine.getTimelineData(this.filterState);

    if (!analyses.length) {
      this.container.innerHTML = `
        <div class="empty-state">
          <p>No analyses match the selected filters.</p>
        </div>
      `;
      return;
    }

    const itemsHtml = analyses
      .map((analysis) => this.renderTimelineItem(analysis))
      .join("");

    this.container.innerHTML = `
      <div class="timeline-items">
        ${itemsHtml}
      </div>
    `;
    this.updateDetailListeners();
  }

  renderTimelineItem(analysis) {
    const severity = analysis.severity_summary || {};
    const defects = analysis.defects || [];
    const keyDefects = defects
      .slice(0, 4)
      .map((defect) => `<span class="defect-tag">${escapeHtml(defect.defectType)}</span>`)
      .join("");
    const docATitle = escapeHtml(analysis.fileAName || "Document A");
    const docBTitle = escapeHtml(analysis.fileBName || "Document B");

    return `
      <article class="timeline-item">
        <header>
          <div>
            <h4>${docATitle} vs ${docBTitle}</h4>
            <p class="timestamp">${formatDateTime(analysis.timestamp)}</p>
          </div>
          <div class="severity-breakdown">
            <span class="severity-tag severity-high">H: ${severity.HIGH || 0}</span>
            <span class="severity-tag severity-medium">M: ${severity.MEDIUM || 0}</span>
            <span class="severity-tag severity-low">L: ${severity.LOW || 0}</span>
          </div>
        </header>
        <div class="defect-tags">${keyDefects}</div>
        <button type="button" class="view-analysis" data-analysis-id="${analysis.id}">View Details</button>
      </article>
    `;
  }

  attachDetailListeners() {
    this.container.querySelectorAll("button.view-analysis").forEach((button) => {
      button.addEventListener("click", () => {
        const id = Number(button.dataset.analysisId);
        const analysis = this.engine.getAnalysisById(id);
        if (analysis && this.detailRenderer) {
          this.detailRenderer(analysis);
        }
      });
    });
  }

  updateDetailListeners() {
    this.attachDetailListeners();
  }
}
