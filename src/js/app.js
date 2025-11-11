import { LearningEngine } from './learning.js';
import { serializeForDisplay } from './db.js';

const HEURISTICS = [
  {
    defect_type: "Missing s.55D directions language",
    statute: "s.55D RSA",
    statute_name: "Road Safety Act s.55D",
    severity: "HIGH",
    description: "Statement of oral breath test directions omits 'in accordance with directions' phrasing required by s.55D(2).",
    recommendation:
      "Create mandatory checklist requiring explicit documentation of oral and written directions, confirmation of understanding, and timing of instructions.",
    evidenceKey: "in accordance with directions",
  },
  {
    defect_type: "Incomplete s.49(1) reason to believe",
    statute: "s.49(1) RSA",
    statute_name: "Road Safety Act s.49(1)",
    severity: "MEDIUM",
    description: "Narrative does not capture concrete observations supporting 'reason to believe' threshold.",
    recommendation: "Document the exact behavioural cues, temporal markers, and corroborating evidence establishing the officer's subjective belief.",
    evidenceKey: "reason to believe",
  },
  {
    defect_type: "Missing qualified technician certification",
    statute: "s.55(5) RSA",
    statute_name: "Road Safety Act s.55(5)",
    severity: "HIGH",
    description: "Documentation does not reference that analysis was completed by a qualified technician with current certification.",
    recommendation: "Update procedure to append technician certification logs and expiry dates to every evidentiary package.",
    evidenceKey: "qualified technician",
  },
  {
    defect_type: "Calibration record absent",
    statute: "s.58 RSA",
    statute_name: "Road Safety Act s.58",
    severity: "MEDIUM",
    description: "Instrument calibration history is not referenced, creating admissibility vulnerability.",
    recommendation: "Embed automated prompt to attach or cite the calibration certificate covering the test period.",
    evidenceKey: "calibration",
  },
  {
    defect_type: "Lack of rights to counsel advisement",
    statute: "Charter s.10(b)",
    statute_name: "Canadian Charter of Rights and Freedoms s.10(b)",
    severity: "HIGH",
    description: "Procedural chronology omits documentation that the subject was informed of the right to counsel and given opportunity to exercise it.",
    recommendation: "Introduce checklist capturing time of advisement, responses, and facilitation of counsel communication.",
    evidenceKey: "right to counsel",
  },
  {
    defect_type: "Chain of custody gap",
    statute: "Evidence Act s.12",
    statute_name: "Evidence Act s.12",
    severity: "MEDIUM",
    description: "Transfer of exhibits lacks timestamps or signatures documenting custody.",
    recommendation: "Require chain of custody ledger entries with timestamps and sign-off for each transfer.",
    evidenceKey: "chain of custody",
  },
  {
    defect_type: "No observation of 15-minute monitoring",
    statute: "s.55(2) RSA",
    statute_name: "Road Safety Act s.55(2)",
    severity: "LOW",
    description: "File does not confirm a continuous 15-minute observation period before breath test.",
    recommendation: "Implement timer prompt and observation checklist before initiating evidentiary breath test.",
    evidenceKey: "15-minute",
  },
];

const SAMPLE_ANALYSES = [
  {
    fileAName: 'Notebook Entry - 12 Jan',
    fileBName: 'Breath Technician Report',
    fileATypes: ['Officer Notes'],
    fileBTypes: ['Technician Report'],
    fileAContent:
      "Subject failed roadside screen. Officer notes omit mention of reason to believe. No reference to right to counsel. Instrument calibration noted.",
    fileBContent:
      "Technician states sample was collected but does not mention qualified technician status nor directions provided in accordance with s.55D.",
  },
  {
    fileAName: 'Incident Report - 18 Feb',
    fileBName: 'Statutory Warning Script',
    fileATypes: ['Incident Report'],
    fileBTypes: ['Script'],
    fileAContent:
      "Officer repeated standard s.55D oral direction but forgot to document 15-minute observation. Right to counsel documented. Chain of custody continuous.",
    fileBContent:
      "Script includes in accordance with directions language. Technician certification attached. Calibration evidence present.",
  },
  {
    fileAName: 'Detention Log - 03 Mar',
    fileBName: 'Charter Advisory Form',
    fileATypes: ['Log'],
    fileBTypes: ['Form'],
    fileAContent:
      "15-minute observation recorded. Reason to believe described. Chain of custody gap at lab transfer.",
    fileBContent:
      "Charter advisory executed but no confirmation of counsel call. Qualified technician certificate missing from appendix.",
  },
];

function detectDefects({ fileAContent = '', fileBContent = '' }) {
  const combined = `${fileAContent}\n${fileBContent}`.toLowerCase();
  const defects = [];

  for (const rule of HEURISTICS) {
    const hasEvidence = combined.includes((rule.evidenceKey || '').toLowerCase());
    if (!hasEvidence) {
      defects.push({
        defect_type: rule.defect_type,
        statute: rule.statute,
        statute_name: rule.statute_name,
        severity: rule.severity,
        description: rule.description,
        recommendation: rule.recommendation,
        evidence_missing: rule.evidenceKey,
      });
    }
  }

  return defects;
}

function buildFindings(defects) {
  const phases = {
    phaseA: [],
    phaseB: [],
    phaseC: [],
  };

  defects.forEach((defect) => {
    if (defect.severity === 'HIGH') {
      phases.phaseA.push(defect);
    } else if (defect.severity === 'MEDIUM') {
      phases.phaseB.push(defect);
    } else {
      phases.phaseC.push(defect);
    }
  });

  return phases;
}

function renderFindings(findings) {
  return `
    <div class="result-card">
      <h3>Phase A - Critical Issues</h3>
      ${findings.phaseA.length ? '<ul>' + findings.phaseA.map((d) => `<li>${d.defect_type}</li>`).join('') + '</ul>' : '<p>No critical issues.</p>'}
    </div>
    <div class="result-card">
      <h3>Phase B - Substantial Issues</h3>
      ${findings.phaseB.length ? '<ul>' + findings.phaseB.map((d) => `<li>${d.defect_type}</li>`).join('') + '</ul>' : '<p>No substantial issues.</p>'}
    </div>
    <div class="result-card">
      <h3>Phase C - Observations</h3>
      ${findings.phaseC.length ? '<ul>' + findings.phaseC.map((d) => `<li>${d.defect_type}</li>`).join('') + '</ul>' : '<p>No notable observations.</p>'}
    </div>
  `;
}

function renderSeveritySummary(summary) {
  return `
    <div class="result-card">
      <h3>Severity Summary</h3>
      <p><strong>High:</strong> ${summary.HIGH}</p>
      <p><strong>Medium:</strong> ${summary.MEDIUM}</p>
      <p><strong>Low:</strong> ${summary.LOW}</p>
    </div>
  `;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

function timelineSummary(record) {
  const high = record.severity_summary?.HIGH || 0;
  const medium = record.severity_summary?.MEDIUM || 0;
  const low = record.severity_summary?.LOW || 0;
  return `High: ${high} • Medium: ${medium} • Low: ${low}`;
}

function createDefectSummary(defects) {
  return defects
    .map((defect) => `<div><span class="badge ${defect.severity.toLowerCase()}">${defect.severity}</span> ${defect.defect_type}</div>`)
    .join('');
}

function renderCrossAnalysis(intel) {
  const sections = [];

  if (intel.recurring.length) {
    sections.push(
      `<div class="card">
        <h4>⚠️ Recurring Patterns</h4>
        <ul>
          ${intel.recurring
            .map(
              (item) => `
                <li>
                  <strong>${item.defect.defect_type}</strong> – seen ${item.occurrences} times
                  <br />Recommendation: ${item.recommendation || 'Review documented remediation plan.'}
                </li>
              `
            )
            .join('')}
        </ul>
      </div>`
    );
  }

  if (intel.seenBefore.length) {
    sections.push(
      `<div class="card">
        <h4>Previously Seen</h4>
        <ul>
          ${intel.seenBefore
            .map((item) => `<li><strong>${item.defect.defect_type}</strong> – last seen ${formatDate(item.last_seen)}</li>`)
            .join('')}
        </ul>
      </div>`
    );
  }

  if (intel.novel.length) {
    sections.push(
      `<div class="card">
        <h4>🆕 Novel Issues</h4>
        <ul>
          ${intel.novel
            .map((item) => `<li><strong>${item.defect.defect_type}</strong> – first observed this analysis.</li>`)
            .join('')}
        </ul>
      </div>`
    );
  }

  return sections.join('') || '<p class="empty">No cross-analysis intelligence available yet.</p>';
}

function renderPatternRecognition({ patterns, recurring, statutes }) {
  const blocks = [];

  if (recurring.length) {
    blocks.push(
      `<div class="card">
        <h4>Recurring Defects</h4>
        <ul>
          ${recurring
            .map(
              (pattern) => `
                <li>
                  <strong>${pattern.defect_type}</strong> – ${pattern.occurrence_count} occurrences
                  <br />Recommendation: ${pattern.recommendation || 'Review mitigation plan.'}
                </li>
              `
            )
            .join('')}
        </ul>
      </div>`
    );
  }

  if (statutes.length) {
    blocks.push(
      `<div class="card">
        <h4>Statutes with Highest Defect Rates</h4>
        <ul>
          ${statutes
            .slice(0, 5)
            .map(
              (statute) => `
                <li>
                  <strong>${statute.reference}</strong> – ${statute.times_encountered} issues
                  <br />Compliance rate: ${(statute.compliance_rate * 100).toFixed(1)}%
                </li>
              `
            )
            .join('')}
        </ul>
      </div>`
    );
  }

  if (!blocks.length) {
    blocks.push('<p class="empty">Run analyses to uncover statistical patterns.</p>');
  }

  return blocks.join('');
}

function renderIntelligenceSummary(insights) {
  const items = [];
  items.push(`<div class="insight-item"><strong>Total analyses performed</strong><span>${insights.totalAnalyses}</span></div>`);
  items.push(`<div class="insight-item"><strong>Total defects identified</strong><span>${insights.totalDefects}</span></div>`);
  if (insights.mostCommonIssue) {
    items.push(
      `<div class="insight-item"><strong>Most common issue</strong><span>${insights.mostCommonIssue.defectType} (${insights.mostCommonIssue.occurrences} occurrences)</span></div>`
    );
  }

  let trendText = 'Insufficient data to assess compliance trend.';
  if (insights.complianceTrend.trend === 'improving') {
    trendText = `Compliance improving by ${(insights.complianceTrend.improvement || 0).toFixed(1)}%`;
  } else if (insights.complianceTrend.trend === 'worsening') {
    trendText = `Compliance declining by ${Math.abs(insights.complianceTrend.improvement || 0).toFixed(1)}%`;
  } else if (insights.complianceTrend.trend === 'stable') {
    trendText = 'Compliance trend stable.';
  }
  items.push(`<div class="insight-item"><strong>Compliance trend</strong><span>${trendText}</span></div>`);

  items.push(`<div class="insight-item"><strong>New issues this analysis</strong><span>${insights.newIssues}</span></div>`);

  if (insights.patternHighlights.recurring.length) {
    const top = insights.patternHighlights.recurring[0];
    items.push(
      `<div class="insight-item"><strong>Recommended improvement</strong><span>${top.defect_type}: ${top.recommendation}</span></div>`
    );
  }

  return items.join('');
}

async function refreshTimeline(filters = {}) {
  const data = await LearningEngine.getTimelineData(filters);
  const container = document.getElementById('timeline-entries');
  const template = document.getElementById('timeline-entry-template');
  container.innerHTML = '';

  data.forEach((record) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('.analysis-date').textContent = formatDate(record.timestamp);
    const docs = node.querySelector('.documents');
    record.documents?.forEach((doc) => {
      const span = document.createElement('span');
      span.textContent = doc.type ? `${doc.name} (${doc.type})` : doc.name;
      docs.appendChild(span);
    });
    node.querySelector('.defects').innerHTML = createDefectSummary(record.defects || []);
    node.querySelector('.severity').textContent = timelineSummary(record);
    node.querySelector('.full-analysis').textContent = serializeForDisplay(record);
    container.appendChild(node);
  });

  if (!data.length) {
    container.innerHTML = '<p class="empty">No analyses stored yet. Run an analysis or load sample data.</p>';
  }
}

async function populateFilters() {
  const { statutes, defects, documentTypes } = await LearningEngine.getFilterOptions();
  const statuteSelect = document.getElementById('filter-statute');
  const defectSelect = document.getElementById('filter-defect');
  const documentSelect = document.getElementById('filter-document');

  const fill = (select, values) => {
    const current = select.value;
    select.innerHTML = '<option value="">All</option>' + values.map((value) => `<option value="${value}">${value}</option>`).join('');
    if (values.includes(current)) {
      select.value = current;
    }
  };

  fill(statuteSelect, statutes);
  fill(defectSelect, defects);
  fill(documentSelect, documentTypes);
}

function getFiltersFromUI() {
  return {
    startDate: document.getElementById('filter-start').value || null,
    endDate: document.getElementById('filter-end').value || null,
    statute: document.getElementById('filter-statute').value || null,
    defectType: document.getElementById('filter-defect').value || null,
    severity: document.getElementById('filter-severity').value || null,
    documentType: document.getElementById('filter-document').value || null,
  };
}

async function handleFiltersChanged() {
  const filters = getFiltersFromUI();
  await refreshTimeline(filters);
}

function attachFilterListeners() {
  ['filter-start', 'filter-end', 'filter-statute', 'filter-defect', 'filter-severity', 'filter-document'].forEach((id) => {
    document.getElementById(id).addEventListener('change', handleFiltersChanged);
  });

  document.getElementById('reset-filters').addEventListener('click', async (event) => {
    event.preventDefault();
    ['filter-start', 'filter-end', 'filter-statute', 'filter-defect', 'filter-severity', 'filter-document'].forEach((id) => {
      document.getElementById(id).value = '';
    });
    await refreshTimeline();
  });
}

function buildExportReport({ analysis, insights, crossAnalysis, patterns, timeline }) {
  const lines = [];
  lines.push('# Enhanced Compliance Analysis Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('');
  lines.push('## Current Analysis Snapshot');
  lines.push(`- Timestamp: ${formatDate(analysis.record.timestamp)}`);
  lines.push(`- Documents: ${analysis.record.fileAName} | ${analysis.record.fileBName}`);
  lines.push('- Severity Summary:');
  lines.push(`  - High: ${analysis.record.severity_summary.HIGH}`);
  lines.push(`  - Medium: ${analysis.record.severity_summary.MEDIUM}`);
  lines.push(`  - Low: ${analysis.record.severity_summary.LOW}`);
  lines.push('');
  lines.push('### Detected Defects');
  (analysis.record.defects || []).forEach((defect) => {
    lines.push(`- **${defect.defect_type}** (${defect.severity})`);
    lines.push(`  - Statute: ${defect.statute}`);
    lines.push(`  - Recommendation: ${defect.recommendation}`);
  });
  lines.push('');
  lines.push('## Cross-Analysis Intelligence');
  ['recurring', 'seenBefore', 'novel'].forEach((key) => {
    const section = crossAnalysis[key];
    if (section?.length) {
      lines.push(`### ${key === 'recurring' ? 'Recurring Patterns' : key === 'seenBefore' ? 'Previously Seen' : 'Novel Issues'}`);
      section.forEach((item) => {
        lines.push(`- ${item.defect.defect_type} – ${item.occurrences} occurrences`);
        if (item.recommendation) {
          lines.push(`  - Recommendation: ${item.recommendation}`);
        }
      });
      lines.push('');
    }
  });

  lines.push('## System Intelligence Summary');
  lines.push(`- Total analyses: ${insights.totalAnalyses}`);
  lines.push(`- Total defects: ${insights.totalDefects}`);
  if (insights.mostCommonIssue) {
    lines.push(`- Most common issue: ${insights.mostCommonIssue.defectType} (${insights.mostCommonIssue.occurrences} occurrences)`);
  }
  lines.push(`- Compliance trend: ${insights.complianceTrend.trend}`);
  lines.push(`- New issues this analysis: ${insights.newIssues}`);
  lines.push('');

  if (patterns.recurring.length) {
    lines.push('## Recurring Defect Recommendations');
    patterns.recurring.forEach((pattern) => {
      lines.push(`- ${pattern.defect_type}: ${pattern.recommendation || 'Review mitigation plan.'}`);
    });
    lines.push('');
  }

  if (patterns.statutes.length) {
    lines.push('## Statutory Compliance Rates');
    patterns.statutes.forEach((statute) => {
      lines.push(`- ${statute.reference}: ${(statute.compliance_rate * 100).toFixed(1)}% compliance`);
    });
    lines.push('');
  }

  lines.push('## Chronological Timeline Overview');
  timeline.slice(0, 5).forEach((record) => {
    lines.push(`- ${formatDate(record.timestamp)} – ${record.fileAName} vs ${record.fileBName}`);
    lines.push(`  - Defects: ${(record.defects || []).map((d) => d.defect_type).join(', ') || 'None'}`);
    lines.push(`  - Severity: ${timelineSummary(record)}`);
  });

  return lines.join('\n');
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportCurrentReport(currentAnalysis) {
  if (!currentAnalysis) {
    alert('Run an analysis before exporting.');
    return;
  }
  const insights = await LearningEngine.generateInsights(currentAnalysis);
  const patterns = await LearningEngine.generatePatternHighlights();
  const timeline = await LearningEngine.getTimelineData();
  const report = buildExportReport({ analysis: currentAnalysis, insights, crossAnalysis: currentAnalysis.crossAnalysis, patterns, timeline });
  downloadText(report, `compliance-report-${Date.now()}.md`);
}

function mapToDocumentTypes(formData) {
  const types = [];
  if (formData.fileATypes) {
    types.push(...formData.fileATypes.filter(Boolean));
  }
  if (formData.fileBTypes) {
    types.push(...formData.fileBTypes.filter(Boolean));
  }
  return Array.from(new Set(types));
}

function prepareAnalysisPayload(formData) {
  const defects = detectDefects(formData);
  const findings = buildFindings(defects);
  const severity_summary = {
    HIGH: defects.filter((d) => d.severity === 'HIGH').length,
    MEDIUM: defects.filter((d) => d.severity === 'MEDIUM').length,
    LOW: defects.filter((d) => d.severity === 'LOW').length,
  };

  return {
    ...formData,
    defects,
    findings,
    severity_summary,
    documentTypes: mapToDocumentTypes(formData),
  };
}

async function runAnalysis(formData) {
  const payload = prepareAnalysisPayload(formData);
  const result = await LearningEngine.recordAnalysis(payload);
  return result;
}

function serializeDefects(defects) {
  return defects
    .map(
      (defect) => `
        <li>
          <strong>${defect.defect_type}</strong> (${defect.severity}) – ${defect.statute}
          <div>${defect.description}</div>
          <div><em>Recommendation:</em> ${defect.recommendation}</div>
        </li>
      `
    )
    .join('');
}

function displayAnalysisResults(result) {
  const container = document.getElementById('analysis-results');
  container.classList.remove('hidden');
  const { record } = result;
  const { defects, findings, severity_summary } = record;

  container.innerHTML = `
    <div class="result-card">
      <h3>Detected Defects</h3>
      ${defects.length ? '<ul>' + serializeDefects(defects) + '</ul>' : '<p>No defects detected.</p>'}
    </div>
    ${renderFindings(findings)}
    ${renderSeveritySummary(severity_summary)}
  `;
}

async function processAnalysis(formData) {
  const analysisResult = await runAnalysis(formData);
  displayAnalysisResults(analysisResult);

  const [insights, patternHighlights] = await Promise.all([
    LearningEngine.generateInsights(analysisResult),
    LearningEngine.generatePatternHighlights(),
  ]);

  document.getElementById('cross-analysis').innerHTML = renderCrossAnalysis(analysisResult.crossAnalysis);
  document.getElementById('pattern-recognition').innerHTML = renderPatternRecognition(patternHighlights);
  document.getElementById('intelligence-summary').innerHTML = renderIntelligenceSummary(insights);

  await populateFilters();
  await refreshTimeline(getFiltersFromUI());

  return analysisResult;
}

function extractFormData() {
  return {
    fileAName: document.getElementById('file-a-name').value.trim(),
    fileBName: document.getElementById('file-b-name').value.trim(),
    fileATypes: [document.getElementById('file-a-type').value.trim()].filter(Boolean),
    fileBTypes: [document.getElementById('file-b-type').value.trim()].filter(Boolean),
    fileAContent: document.getElementById('file-a-content').value,
    fileBContent: document.getElementById('file-b-content').value,
  };
}

async function runSampleAnalyses(options = {}) {
  const { showAlert = true } = options;
  let lastResult = null;
  for (const sample of SAMPLE_ANALYSES) {
    lastResult = await processAnalysis(sample);
  }
  if (showAlert) {
    alert('Sample analyses complete. Review the timeline and insights for learned intelligence.');
  }
  return lastResult;
}

async function maybeSeedInitialAnalyses() {
  const hasExistingAnalyses = await LearningEngine.hasAnalyses();
  if (hasExistingAnalyses) {
    return null;
  }
  return runSampleAnalyses({ showAlert: false });
}

function clearForm() {
  document.getElementById('analysis-form').reset();
}

async function init() {
  await LearningEngine.initialize();
  await populateFilters();
  await refreshTimeline();
  attachFilterListeners();

  let latestAnalysis = null;

  const seededResult = await maybeSeedInitialAnalyses();
  if (seededResult) {
    latestAnalysis = seededResult;
  }

  document.getElementById('analysis-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = extractFormData();
    const result = await processAnalysis(data);
    latestAnalysis = result;
    clearForm();
  });

  document.getElementById('run-sample-analyses').addEventListener('click', async () => {
    latestAnalysis = await runSampleAnalyses();
  });

  document.getElementById('export-report').addEventListener('click', async () => {
    await exportCurrentReport(latestAnalysis);
  });
}

window.addEventListener('DOMContentLoaded', init);
