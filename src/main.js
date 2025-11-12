import { analyzeDocuments } from "./services/analyzer.js";
import { LearningEngine } from "./services/learningEngine.js";
import { TimelineView } from "./components/TimelineView.js";
import { LearningInsightsPanel } from "./components/LearningInsightsPanel.js";
import { CrossAnalysisIntelligence } from "./components/CrossAnalysisIntelligence.js";
import { ExportManager } from "./services/exporter.js";
import { sampleAnalyses } from "./sample/sampleAnalyses.js";
import { escapeHtml, formatDateTime } from "./utils/helpers.js";

const engine = new LearningEngine();

async function bootstrap() {
  await engine.initialize();

  const analysisSummaryContainer = document.getElementById("analysis-summary");
  const defectDetailContainer = document.getElementById("defect-detail");

  const detailRenderer = (analysis) => renderAnalysisDetail(analysis);
  new TimelineView(document.getElementById("timeline-view"), engine, detailRenderer);
  new LearningInsightsPanel(document.getElementById("insights-panel"), engine);
  new CrossAnalysisIntelligence(document.getElementById("cross-analysis"), engine);
  new ExportManager(document.getElementById("export-report"), engine);

  engine.on("analysis-recorded", ({ analysis }) => {
    renderLatestAnalysis(analysis, analysisSummaryContainer, defectDetailContainer);
  });

  const latest = engine.getCurrentAnalysis();
  if (latest) {
    renderLatestAnalysis(latest, analysisSummaryContainer, defectDetailContainer);
  }

  bindFormHandlers(analysisSummaryContainer, defectDetailContainer);
  bindUtilityButtons(analysisSummaryContainer, defectDetailContainer);
}

document.addEventListener("DOMContentLoaded", bootstrap);

function bindFormHandlers(analysisSummaryContainer, defectDetailContainer) {
  const form = document.getElementById("analysis-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      fileAName: formData.get("fileAName"),
      fileBName: formData.get("fileBName"),
      fileAContent: formData.get("fileAContent"),
      fileBContent: formData.get("fileBContent"),
      analysisContext: formData.get("analysisContext"),
    };
    const analysis = analyzeDocuments(payload);
    const saved = await engine.recordAnalysis(analysis);
    renderLatestAnalysis(saved, analysisSummaryContainer, defectDetailContainer);
  });
}

function bindUtilityButtons(summaryContainer, defectContainer) {
  const sampleButton = document.getElementById("load-sample-analyses");
  const resetButton = document.getElementById("clear-storage");

  if (sampleButton) {
    sampleButton.addEventListener("click", async () => {
      sampleButton.disabled = true;
      sampleButton.textContent = "Loading samples...";
      await engine.importAnalyses(sampleAnalyses);
      sampleButton.textContent = "Sample Analyses Loaded";
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", async () => {
      await engine.reset();
      resetButton.textContent = "Storage Cleared";
      renderLatestAnalysis(null, summaryContainer, defectContainer);
      setTimeout(() => (resetButton.textContent = "Reset Storage"), 2500);
      if (sampleButton) {
        sampleButton.disabled = false;
        sampleButton.textContent = "Load Sample Analyses";
      }
    });
  }
}

function renderLatestAnalysis(analysis, summaryContainer, defectContainer) {
  if (!summaryContainer || !defectContainer) return;
  if (!analysis) {
    summaryContainer.classList.add("empty-state");
    summaryContainer.innerHTML = "<p>No analyses have been run yet.</p>";
    defectContainer.classList.add("hidden");
    defectContainer.innerHTML = "";
    return;
  }

  summaryContainer.classList.remove("empty-state");
  const docATitle = escapeHtml(analysis.fileAName || "Document A");
  const docBTitle = escapeHtml(analysis.fileBName || "Document B");
  const summaryText = escapeHtml(analysis.findings?.summary || "No summary available.");
  const divergence = escapeHtml(analysis.findings?.phaseA?.divergenceSummary || "No divergence noted.");
  const recommendationsList = (analysis.findings?.phaseC?.recommendations || [])
    .map((item) => escapeHtml(item))
    .join("; ");
  const recommendations = recommendationsList || "None recorded";
  summaryContainer.innerHTML = `
    <h4>${docATitle} vs ${docBTitle}</h4>
    <p class="timestamp">${formatDateTime(analysis.timestamp)}</p>
    <p>${summaryText}</p>
    <ul>
      <li>${divergence}</li>
      <li>${analysis.findings?.phaseB?.nonCompliant || 0} statutes flagged for remediation.</li>
      <li>Recommendations: ${recommendations}</li>
    </ul>
  `;

  const defects = analysis.defects || [];
  if (!defects.length) {
    defectContainer.classList.add("hidden");
    defectContainer.innerHTML = "";
    return;
  }

  defectContainer.classList.remove("hidden");
  defectContainer.innerHTML = `
    <h4>Defect Breakdown</h4>
    <ul>
      ${defects
        .map(
          (defect) => `
            <li>
              <strong>${escapeHtml(defect.defectType)}</strong> · <span class="badge severity-${
                defect.severity?.toLowerCase?.() || "low"
              }">${escapeHtml(defect.severity || "LOW")}</span>
              <div>${escapeHtml(defect.description || "No description.")}</div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderAnalysisDetail(analysis) {
  const template = document.getElementById("analysis-detail-template");
  if (!template) return;
  const fragment = template.content.cloneNode(true);
  const article = fragment.querySelector(".analysis-detail");
  article.querySelector("h4").textContent = `${analysis.fileAName || "Document A"} vs ${
    analysis.fileBName || "Document B"
  }`;
  article.querySelector(".detail-timestamp").textContent = formatDateTime(analysis.timestamp);

  const summarySection = article.querySelector(".detail-section.summary");
  summarySection.innerHTML = `
    <p>${escapeHtml(analysis.findings?.summary || "No narrative available.")}</p>
    <ul>
      <li>${escapeHtml(analysis.findings?.phaseA?.divergenceSummary || "No divergence noted.")}</li>
      <li>${analysis.findings?.phaseB?.nonCompliant || 0} statute(s) non-compliant.</li>
      <li>Focus areas: ${escapeHtml((analysis.findings?.phaseC?.focusAreas || []).join(", ") || "None")}</li>
    </ul>
  `;

  const defectsSection = article.querySelector(".detail-section.defects");
  const defects = analysis.defects || [];
  defectsSection.innerHTML = `
    <h5>Defects (${defects.length})</h5>
    <ul>
      ${defects
        .map(
          (defect) => `
            <li>
              <strong>${escapeHtml(defect.defectType)}</strong> · <span class="badge severity-${
                defect.severity?.toLowerCase?.() || "low"
              }">${escapeHtml(defect.severity || "LOW")}</span>
              <div>${escapeHtml(defect.description || "No description provided.")}</div>
              <div><em>Recommendation:</em> ${escapeHtml(defect.recommendation || "Not specified.")}</div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;

  const statuteSection = article.querySelector(".detail-section.statutes");
  const statuteOutcomes = analysis.findings?.statuteOutcomes || [];
  statuteSection.innerHTML = `
    <h5>Statutory Outcomes</h5>
    <ul>
      ${statuteOutcomes
        .map(
          (outcome) => `
            <li>
              <span class="badge statute">${escapeHtml(outcome.reference)}</span>
              <span>${escapeHtml(outcome.statute_name || "")}</span>
              <span>${outcome.compliant ? "✅ Compliant" : "⚠️ Non-compliant"}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;

  const overlay = document.createElement("div");
  overlay.className = "detail-overlay";
  const closeOverlay = () => overlay.remove();
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });
  article.addEventListener("click", (event) => event.stopPropagation());

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "Close";
  closeButton.className = "secondary";
  closeButton.addEventListener("click", closeOverlay);
  article.appendChild(closeButton);

  overlay.appendChild(article);
  document.body.appendChild(overlay);
}
