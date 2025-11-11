export const sampleAnalyses = [
  {
    timestamp: "2024-07-05T09:12:00.000Z",
    fileAName: "Breath Test Narrative",
    fileBName: "Officer Statement",
    fileAContent:
      "Officer advised the subject to submit to breath analysis in accordance with s.55D directions. Observation period documented. Certificate issued.",
    fileBContent:
      "Subject was taken to station. Officer forgot to note directions in accordance with s.55D. No certificate attached.",
    analysisContext: "Initial training review",
    findings: {
      statuteOutcomes: [
        {
          reference: "s.55D RSA",
          statute_name: "Road Safety Act 1986",
          compliant: false,
          associatedDefects: ["Missing s.55D directions language"],
        },
        {
          reference: "s.80 Evidence Act",
          statute_name: "Evidence Act 2008",
          compliant: false,
          associatedDefects: ["Breath certificate unavailable"],
        },
      ],
    },
    defects: [
      {
        defectType: "Missing s.55D directions language",
        severity: "HIGH",
        statutes: [
          { reference: "s.55D RSA", statute_name: "Road Safety Act 1986" },
        ],
        description:
          "Documentation does not confirm subject was instructed in accordance with s.55D requirements.",
        recommendation:
          "Systematic issue with preliminary test directions. Create checklist capturing oral/written directions, subject comprehension, and timing of instructions (s.55D).",
      },
      {
        defectType: "Breath certificate unavailable",
        severity: "HIGH",
        statutes: [
          { reference: "s.80 Evidence Act", statute_name: "Evidence Act 2008" },
        ],
        description: "Evidence Act certificate absent, risking admissibility challenge.",
        recommendation:
          "Audit instrument integration to ensure automatic generation of s.80 certificates and implement escalation when not generated within 1 hour.",
      },
    ],
    severity_summary: { HIGH: 2, MEDIUM: 0, LOW: 0 },
  },
  {
    timestamp: "2024-08-14T14:45:00.000Z",
    fileAName: "Charge Brief",
    fileBName: "Supervisor Review",
    fileAContent:
      "Subject failed to provide sample. Officer formed belief under s.49(1) due to strong odour and slurred speech.",
    fileBContent:
      "Supervisor noted missing grounds under s.49(1) and missing observation period details.",
    analysisContext: "Quality assurance audit",
    findings: {
      statuteOutcomes: [
        {
          reference: "s.49(1) RSA",
          statute_name: "Road Safety Act 1986",
          compliant: false,
          associatedDefects: ["Incomplete s.49(1) grounds"],
        },
        {
          reference: "s.80 Evidence Act",
          statute_name: "Evidence Act 2008",
          compliant: false,
          associatedDefects: ["Unrecorded observation period"],
        },
      ],
    },
    defects: [
      {
        defectType: "Incomplete s.49(1) grounds",
        severity: "MEDIUM",
        statutes: [
          { reference: "s.49(1) RSA", statute_name: "Road Safety Act 1986" },
        ],
        description:
          "Narrative fails to document statutory basis for forming reasonable belief under s.49(1).",
        recommendation:
          "Reinforce template prompts for officers to articulate observations supporting s.49(1) belief formation, including sensory indicators and contextual cues.",
      },
      {
        defectType: "Unrecorded observation period",
        severity: "MEDIUM",
        statutes: [
          { reference: "s.80 Evidence Act", statute_name: "Evidence Act 2008" },
        ],
        description: "Breath test observation window absent or undocumented.",
        recommendation:
          "Institute digital timer checklist requiring officers to log start/end of observation period and verify compliance with evidentiary prerequisites.",
      },
    ],
    severity_summary: { HIGH: 0, MEDIUM: 2, LOW: 0 },
  },
  {
    timestamp: "2024-09-28T10:30:00.000Z",
    fileAName: "Notice Service Log",
    fileBName: "Case Notes",
    fileAContent:
      "Notice served after statutory period due to late witness availability. Officer mentioned missing observation period as well.",
    fileBContent:
      "Case notes highlight recurring missing s.55D language and late statutory notice.",
    analysisContext: "Escalation review",
    findings: {
      statuteOutcomes: [
        {
          reference: "s.171 CPA",
          statute_name: "Criminal Procedure Act 2009",
          compliant: false,
          associatedDefects: ["Late statutory notice service"],
        },
        {
          reference: "s.55D RSA",
          statute_name: "Road Safety Act 1986",
          compliant: false,
          associatedDefects: ["Missing s.55D directions language"],
        },
      ],
    },
    defects: [
      {
        defectType: "Late statutory notice service",
        severity: "LOW",
        statutes: [
          { reference: "s.171 CPA", statute_name: "Criminal Procedure Act 2009" },
        ],
        description: "Service of statutory notice outside mandated timeframe.",
        recommendation:
          "Automate reminder workflow for statutory notice service and flag approaching deadlines within case management system.",
      },
      {
        defectType: "Missing s.55D directions language",
        severity: "HIGH",
        statutes: [
          { reference: "s.55D RSA", statute_name: "Road Safety Act 1986" },
        ],
        description:
          "Documentation does not confirm subject was instructed in accordance with s.55D requirements.",
        recommendation:
          "Systematic issue with preliminary test directions. Create checklist capturing oral/written directions, subject comprehension, and timing of instructions (s.55D).",
      },
    ],
    severity_summary: { HIGH: 1, MEDIUM: 0, LOW: 1 },
  },
];
