import {
  computeSeveritySummary,
  generateId,
  normalizeStatuteReference,
} from "../utils/helpers.js";

const STATUTE_LIBRARY = {
  "S.55D": {
    statute_name: "Road Safety Act 1986",
    label: "s.55D RSA",
  },
  "S.55D(2)": {
    statute_name: "Road Safety Act 1986",
    label: "s.55D(2) RSA",
  },
  "S.49": {
    statute_name: "Road Safety Act 1986",
    label: "s.49 RSA",
  },
  "S.49(1)": {
    statute_name: "Road Safety Act 1986",
    label: "s.49(1) RSA",
  },
  "S.80": {
    statute_name: "Evidence Act 2008",
    label: "s.80 Evidence Act",
  },
  "S.171": {
    statute_name: "Criminal Procedure Act 2009",
    label: "s.171 CPA",
  },
};

const KNOWN_DEFECT_PATTERNS = [
  {
    defectType: "Missing s.55D directions language",
    regex: /missing[^.]{0,120}(direction|instruction|advise).*s\.?55d/i,
    severity: "HIGH",
    statutes: ["S.55D"],
    description:
      "Documentation does not confirm subject was instructed in accordance with s.55D requirements.",
    recommendation:
      "Systematic issue with preliminary test directions. Create checklist capturing oral/written directions, subject comprehension, and timing of instructions (s.55D).",
  },
  {
    defectType: "Incomplete s.49(1) grounds",
    regex: /(no|without)\s+(reasonable\s+)?(grounds|basis).*s\.?49/i,
    severity: "MEDIUM",
    statutes: ["S.49(1)"],
    description:
      "Narrative fails to document statutory basis for forming reasonable belief under s.49(1).",
    recommendation:
      "Reinforce template prompts for officers to articulate observations supporting s.49(1) belief formation, including sensory indicators and contextual cues.",
  },
  {
    defectType: "Unrecorded observation period",
    regex: /(no|missing)\s+(observation|monitoring)\s+period/i,
    severity: "MEDIUM",
    statutes: ["S.80"],
    description: "Breath test observation window absent or undocumented.",
    recommendation:
      "Institute digital timer checklist requiring officers to log start/end of observation period and verify compliance with evidentiary prerequisites.",
  },
  {
    defectType: "Late statutory notice service",
    regex: /(served|issued)\s+(after|beyond)\s+(the\s+)?(statutory|required)\s+(period|time)/i,
    severity: "LOW",
    statutes: ["S.171"],
    description: "Service of statutory notice outside mandated timeframe.",
    recommendation:
      "Automate reminder workflow for statutory notice service and flag approaching deadlines within case management system.",
  },
];

export function analyzeDocuments({
  fileAName,
  fileAContent,
  fileBName,
  fileBContent,
  analysisContext = "",
}) {
  const timestamp = new Date().toISOString();
  const normalizedA = (fileAContent || "").trim();
  const normalizedB = (fileBContent || "").trim();
  const combinedText = `${normalizedA}\n${normalizedB}`;

  const statuteInfo = extractStatutes(combinedText);
  const statuteReferences = statuteInfo.references;
  const diffs = computeDiffs(normalizedA, normalizedB);
  const detectedDefects = detectDefects({
    combinedText,
    fileA: normalizedA,
    fileB: normalizedB,
    statuteReferences,
    diffs,
  });

  const enrichedDefects = detectedDefects.map((defect) => enrichDefect(defect, statuteInfo.details));

  const severitySummary = computeSeveritySummary(enrichedDefects);
  const statuteOutcomes = buildStatuteOutcomes(statuteInfo.details, enrichedDefects);
  const findings = buildFindings({
    diffs,
    statuteOutcomes,
    defects: enrichedDefects,
    severitySummary,
    statuteReferences,
    analysisContext,
    fileAName,
    fileBName,
  });

  return {
    timestamp,
    fileAName,
    fileBName,
    fileAContent: normalizedA,
    fileBContent: normalizedB,
    analysisContext: analysisContext.trim(),
    findings,
    defects: enrichedDefects,
    severity_summary: {
      HIGH: severitySummary.HIGH,
      MEDIUM: severitySummary.MEDIUM,
      LOW: severitySummary.LOW,
    },
  };
}

function extractStatutes(text) {
  const matches = text.match(/s\.?\d+[a-z]?\(?\d*\)?/gi) || [];
  const references = new Set();
  const details = [];

  matches.forEach((match) => {
    const normalized = normalizeStatuteReference(match);
    if (!normalized) return;
    const base = normalized.replace(/RSA|EVIDENCEACT|CPA/gi, "");
    references.add(base);
  });

  for (const reference of references) {
    const statuteMeta = STATUTE_LIBRARY[reference] || {};
    details.push({
      reference: statuteMeta.label || reference,
      statute_name: statuteMeta.statute_name || "",
    });
  }

  return {
    references: [...references],
    details,
  };
}

function computeDiffs(textA, textB) {
  const linesA = textA.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const linesB = textB.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const setA = new Set(linesA);
  const setB = new Set(linesB);

  const uniqueToA = linesA.filter((line) => !setB.has(line));
  const uniqueToB = linesB.filter((line) => !setA.has(line));

  return {
    uniqueToA,
    uniqueToB,
    overlap: linesA.filter((line) => setB.has(line)),
  };
}

function detectDefects({ combinedText, fileA, fileB, statuteReferences, diffs }) {
  const defects = [];
  const lowered = combinedText.toLowerCase();

  for (const pattern of KNOWN_DEFECT_PATTERNS) {
    if (pattern.regex.test(combinedText)) {
      defects.push({
        defectType: pattern.defectType,
        severity: pattern.severity,
        statutes: pattern.statutes,
        description: pattern.description,
        recommendation: pattern.recommendation,
        evidence: extractEvidenceSnippet(lowered, pattern.regex),
      });
    }
  }

  if (diffs.uniqueToA.length && statuteReferences.includes("S.55D")) {
    defects.push({
      defectType: "Directions discrepancy",
      severity: "MEDIUM",
      statutes: ["S.55D"],
      description:
        "Statements diverge on directions issued under s.55D. Document A contains instructions absent from Document B.",
      recommendation:
        "Align documentation templates to capture uniform s.55D directions across all artefacts and require supervisor sign-off on discrepancies.",
      evidence: diffs.uniqueToA.slice(0, 3),
    });
  }

  if (/\bno\s+certificate\b/i.test(combinedText) && statuteReferences.includes("S.80")) {
    defects.push({
      defectType: "Breath certificate unavailable",
      severity: "HIGH",
      statutes: ["S.80"],
      description: "Evidence Act certificate absent, risking admissibility challenge.",
      recommendation:
        "Audit instrument integration to ensure automatic generation of s.80 certificates and implement escalation when not generated within 1 hour.",
    });
  }

  if (!defects.length && statuteReferences.length) {
    defects.push({
      defectType: "Potential compliance gap",
      severity: "LOW",
      statutes: statuteReferences.slice(0, 2),
      description:
        "No explicit defect detected but statutory references warrant manual verification for completeness.",
      recommendation:
        "Undertake targeted review against statutory checklist to confirm documentation sufficiency.",
    });
  }

  return defects;
}

function extractEvidenceSnippet(loweredText, regex) {
  const index = loweredText.search(regex);
  if (index === -1) return "";
  const start = Math.max(0, index - 80);
  const end = Math.min(loweredText.length, index + 160);
  return loweredText.slice(start, end).trim();
}

function enrichDefect(defect, statuteDetails = []) {
  const defectId = generateId("defect");
  const normalizedStatutes = (defect.statutes || []).map((reference) => {
    const normalized = normalizeStatuteReference(reference);
    const matchedDetail = statuteDetails.find((detail) =>
      normalizeStatuteReference(detail.reference) === normalized
    );
    return {
      reference: matchedDetail?.reference || reference,
      statute_name: matchedDetail?.statute_name || STATUTE_LIBRARY[normalized]?.statute_name || "",
    };
  });

  return {
    ...defect,
    defectId,
    statutes: normalizedStatutes,
  };
}

function buildStatuteOutcomes(statuteDetails, defects) {
  return statuteDetails.map((detail) => {
    const normalized = normalizeStatuteReference(detail.reference);
    const associated = defects.filter((defect) =>
      (defect.statutes || []).some(
        (statute) => normalizeStatuteReference(statute.reference) === normalized
      )
    );
    const compliant = associated.length === 0;
    return {
      reference: detail.reference,
      statute_name: detail.statute_name,
      compliant,
      associatedDefects: associated.map((defect) => defect.defectType),
    };
  });
}

function buildFindings({
  diffs,
  statuteOutcomes,
  defects,
  severitySummary,
  statuteReferences,
  analysisContext,
  fileAName,
  fileBName,
}) {
  const highSeverity = defects.filter((defect) => defect.severity === "HIGH");
  const mediumSeverity = defects.filter((defect) => defect.severity === "MEDIUM");
  const lowSeverity = defects.filter((defect) => defect.severity === "LOW");

  const overallSummary = [
    `${defects.length} defect${defects.length === 1 ? "" : "s"} detected across ${statuteReferences.length} statutory reference${statuteReferences.length === 1 ? "" : "s"}.`,
  ];
  if (analysisContext?.trim()) {
    overallSummary.push(`Context noted: ${analysisContext.trim()}`);
  }

  const severityNarrative = [
    highSeverity.length ? `${highSeverity.length} high risk` : null,
    mediumSeverity.length ? `${mediumSeverity.length} medium risk` : null,
    lowSeverity.length ? `${lowSeverity.length} low risk` : null,
  ]
    .filter(Boolean)
    .join(", ");

  if (severityNarrative) {
    overallSummary.push(`Risk distribution: ${severityNarrative}.`);
  }

  const unresolvedStatutes = statuteOutcomes.filter((outcome) => !outcome.compliant);

  return {
    summary: overallSummary.join(" "),
    phaseA: {
      name: "Document Comparison",
      fileAName,
      fileBName,
      divergenceSummary: buildDiffSummary(diffs, fileAName, fileBName),
      uniqueToA: diffs.uniqueToA,
      uniqueToB: diffs.uniqueToB,
    },
    phaseB: {
      name: "Statutory Mapping",
      statutesAssessed: statuteOutcomes.length,
      compliant: statuteOutcomes.filter((outcome) => outcome.compliant).length,
      nonCompliant: unresolvedStatutes.length,
      unresolvedStatutes,
    },
    phaseC: {
      name: "Risk Synthesis",
      severitySummary,
      recommendations: synthesizeRecommendations(defects),
      focusAreas: unresolvedStatutes.map((outcome) => outcome.reference),
    },
    statuteOutcomes,
  };
}

function buildDiffSummary(diffs, fileAName, fileBName) {
  const linesA = diffs.uniqueToA.length;
  const linesB = diffs.uniqueToB.length;
  if (!linesA && !linesB) {
    return "Documents contain consistent narratives with no unique statements detected.";
  }

  const parts = [];
  if (linesA) {
    parts.push(`${linesA} statement${linesA === 1 ? "" : "s"} unique to ${fileAName || "Document A"}`);
  }
  if (linesB) {
    parts.push(`${linesB} statement${linesB === 1 ? "" : "s"} unique to ${fileBName || "Document B"}`);
  }
  return `Divergence detected: ${parts.join("; ")}.`;
}

function synthesizeRecommendations(defects) {
  const recommendations = new Set();
  for (const defect of defects) {
    if (defect.recommendation) {
      recommendations.add(defect.recommendation);
    }
  }
  if (!recommendations.size) {
    recommendations.add(
      "Maintain proactive evidence capture and perform manual review against statutory obligations checklist."
    );
  }
  return [...recommendations];
}
