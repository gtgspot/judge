'use strict';

/**
 * Forensic Legal Analyzer - Independent Configuration File
 *
 * This configuration file centralises CDN dependencies, legislative frameworks,
 * statutory test logic, and automated document processing utilities required by
 * the Forensic Legal Analyzer application. The configuration is designed to be
 * consumed in both browser and Node.js environments and exposes a rich set of
 * helper utilities for analysing Victorian legal documents against the
 * statutory requirements that empower investigative powers.
 *
 * Version: 2.1.0
 * Jurisdiction: Victoria, Australia
 * Last Updated: 2025-01-15
 */

const ForensicAnalyzerConfig = {
  metadata: {
    appName: 'Forensic Legal Analyzer',
    version: '2.1.0',
    jurisdiction: 'Victoria, Australia',
    description:
      'Centralised configuration and statutory compliance utilities for the Forensic Legal Analyzer application.',
    maintainers: [
      {
        name: 'Forensic Automation Team',
        contact: 'forensics@analysis.example.com',
        role: 'Primary Maintainer'
      }
    ],
    complianceNotes: [
      'Implements objective/subjective dual limb tests derived from George v Rockett (1990) 170 CLR 104.',
      'Encapsulates statutory sequences for Road Safety Act 1986 (Vic), Evidence Act 2008 (Vic), and Criminal Procedure Act 2009 (Vic).',
      'Automatically evaluates uploaded documents against the applicable legislative framework before surfacing results to the client UI.'
    ]
  },

  cdn: {
    react: 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
    reactDom: 'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
    babel: 'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js',
    tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
    pdfjs: {
      script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    },
    mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
  },

  theme: {
    colours: {
      primary: '#1B4F72',
      secondary: '#154360',
      success: '#1E8449',
      warning: '#B9770E',
      danger: '#922B21',
      info: '#117864',
      neutral: '#566573',
      severity: {
        critical: '#C0392B',
        high: '#D35400',
        medium: '#F1C40F',
        low: '#7FB3D5'
      }
    },
    typography: {
      family: '"Source Sans Pro", "Segoe UI", sans-serif',
      sizes: {
        xxs: '0.65rem',
        xs: '0.75rem',
        sm: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        xxl: '1.5rem',
        display: '2.125rem'
      }
    },
    spacingScale: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40]
  },

  severityLevels: {
    critical: {
      label: 'Critical',
      description:
        'A failure that undermines jurisdictional validity or breaches statutory preconditions. Immediate remediation required before evidence is relied upon.',
      priority: 1
    },
    high: {
      label: 'High',
      description:
        'A defect that threatens admissibility or compliance with procedural fairness. Requires expedited remediation and supervisory review.',
      priority: 2
    },
    medium: {
      label: 'Medium',
      description:
        'A defect that may diminish probative weight or clarity but does not automatically bar admissibility. Should be addressed prior to hearing.',
      priority: 3
    },
    low: {
      label: 'Low',
      description:
        'A formatting or stylistic issue. Monitor to prevent cumulative impact but does not independently affect admissibility.',
      priority: 4
    }
  },

  statutoryTests: {
    reasonableBelief: {
      id: 'reasonableBelief',
      name: 'Reasonable Belief Dual-Limb Test',
      caseAuthority: 'George v Rockett (1990) 170 CLR 104',
      subjectiveElement: {
        description:
          'The officer genuinely formed the belief or suspicion in question. Evidence of actual mental state must be disclosed.',
        indicators: [
          'believed',
          'formed the belief',
          'formed the opinion',
          'suspected',
          'was satisfied',
          'held the view',
          'I believed',
          'I suspected',
          'I was satisfied',
          'I had grounds'
        ],
        regex: [/\bformed (?:the )?(?:belief|opinion)\b/i, /\bI\s+(?:honestly\s+)?believed\b/i, /\bheld\s+the\s+view\b/i]
      },
      objectiveElement: {
        description:
          'A reasonable person with the same facts and circumstances would reach the same belief. Requires concrete observable facts.',
        objectiveFactIndicators: [
          'observed',
          'witnessed',
          'smelt alcohol',
          'detected',
          'measured',
          'recorded',
          'saw',
          'heard',
          'noted',
          'examined',
          'verified',
          'photographed'
        ],
        factualBasisRegex: [/\bobserved\b/i, /\bnoticed\b/i, /\bI\s+(?:detected|measured)\b/i, /\brecorded\b/i]
      },
      insufficientGroundsIndicators: [/\b(?:hunch|gut feeling|intuition|instinct)\b/i, /\bseemed\s+nervous\b/i]
    },
    reasonableGrounds: {
      id: 'reasonableGrounds',
      name: 'Reasonable Grounds Verification',
      description:
        'Ensures the officer can articulate facts that would lead an ordinary, prudent person to the same suspicion or belief.',
      components: {
        factualMatrix: {
          description: 'Presence of articulable facts, not conjecture.',
          requiredIndicators: [/\bfacts?\b/i, /\bparticulars?\b/i, /\bevidence\b/i]
        },
        objectiveAssessment: {
          description: 'References to an objective standard or hypothetical observer.',
          requiredIndicators: [/\breasonable\s+person\b/i, /\bobjective\b/i, /\bwould\s+have\s+believed\b/i]
        }
      }
    }
  },

  legislationIndex: [
    {
      act: 'Road Safety Act 1986 (Vic)',
      aliases: [/road safety act/i, /rsa\s*1986/i],
      keySections: ['49', '55D', '55E'],
      summary:
        'Governs preliminary breath testing, the conditions under which evidentiary breath analyses may be undertaken, and device maintenance requirements.'
    },
    {
      act: 'Evidence Act 2008 (Vic)',
      aliases: [/evidence act\s*2008/i, /evidence\s+act\s*\(vic\)/i],
      keySections: ['137', '138'],
      summary:
        'Sets out admissibility rules, including exclusion for unfair prejudice and improperly obtained evidence.'
    },
    {
      act: 'Criminal Procedure Act 2009 (Vic)',
      aliases: [/criminal procedure act/i, /cpa\s*2009/i],
      keySections: ['185', '187'],
      summary:
        'Regulates disclosure obligations between prosecution and defence in criminal proceedings.'
    }
  ],

  tests: {
    provisionalElements: {
      reasonableBelief: {
        referenceTest: 'reasonableBelief',
        failureSeverity: 'critical',
        description:
          'Validates that both limbs of the reasonable belief test are satisfied before statutory powers contingent on reasonable belief are exercised.'
      },
      reasonableGrounds: {
        referenceTest: 'reasonableGrounds',
        failureSeverity: 'high',
        description:
          'Ensures reasonable grounds are articulated with sufficient factual detail to satisfy statutory prerequisites.'
      }
    },
    statutorySequences: {
      'Road Safety Act 1986 (Vic)': {
        section49: {
          section: 's 49(1)',
          description: 'Preliminary breath test powers and prerequisites.',
          sequence: [
            {
              id: 'triggerCircumstance',
              label: 'Trigger circumstance identified',
              requirement:
                'Document must identify a qualifying circumstance under s 49(1)(a)-(h) before the test is administered.',
              indicators: [
                /\bdriver\b/i,
                /\bwas\s+driving\b/i,
                /\bin\s+charge\b/i,
                /\baccident\b/i,
                /\breasonable\s+belief\s+that\s+alcohol\s+was\s+consumed\b/i
              ],
              severityOnFailure: 'critical'
            },
            {
              id: 'requirementCommunicated',
              label: 'Requirement communicated',
              requirement:
                'Officer must inform the person of the requirement to furnish a sample before the test occurs.',
              indicators: [
                /\brequired\s+him\s+to\s+submit\b/i,
                /\binformed\s+the\s+driver\b/i,
                /\badvised\s+her\s+that\s+/i,
                /\bexplained\s+the\s+requirement\b/i
              ],
              severityOnFailure: 'high'
            },
            {
              id: 'complianceOutcome',
              label: 'Outcome recorded',
              requirement:
                'Document should record the outcome of the preliminary test including compliance/refusal and readings.',
              indicators: [/\breturned\s+a\s+result\b/i, /\breading\s+of\b/i, /\brefused\b/i, /\bcomplied\b/i],
              severityOnFailure: 'medium'
            }
          ],
          linkedProvisionalElements: ['reasonableBelief']
        },
        section55E: {
          section: 's 55E',
          description: 'Proper performance and maintenance of breath analysing instruments.',
          sequence: [
            {
              id: 'deviceApproved',
              label: 'Device approval recorded',
              requirement:
                'Record should specify that the device used is an approved device under s 55E(1).',
              indicators: [/\bapproved\s+breathalyser\b/i, /\btype\s+approval\b/i, /\bcalibration\s+certificate\b/i],
              severityOnFailure: 'critical'
            },
            {
              id: 'deviceMaintained',
              label: 'Maintenance documented',
              requirement:
                'Maintenance logs or calibration details must be identified to show compliance with s 55E(2).',
              indicators: [/\bmaintenance\s+log\b/i, /\bcalibrated\s+on\b/i, /\bservice\s+record\b/i],
              severityOnFailure: 'high'
            }
          ]
        }
      },
      'Evidence Act 2008 (Vic)': {
        section137: {
          section: 's 137',
          description: 'Exclusion for unfair prejudice.',
          sequence: [
            {
              id: 'probativeAssessment',
              label: 'Probative value assessed',
              requirement:
                'Document should analyse probative value of the evidence.',
              indicators: [/\bprobative\s+value\b/i, /\brelevance\b/i],
              severityOnFailure: 'medium'
            },
            {
              id: 'prejudiceAssessment',
              label: 'Prejudicial effect considered',
              requirement:
                'Document must consider prejudicial effect to the accused.',
              indicators: [/\bprejudicial\b/i, /\bunfair\s+prejudice\b/i, /\brisk\s+of\s+misuse\b/i],
              severityOnFailure: 'high'
            }
          ]
        },
        section138: {
          section: 's 138',
          description: 'Improperly obtained evidence exclusion discretion.',
          sequence: [
            {
              id: 'improprietyIdentified',
              label: 'Impropriety identified',
              requirement:
                'Document identifies whether evidence was obtained improperly or illegally.',
              indicators: [/\bimproperly\b/i, /\bill?egal\b/i, /\bbreach\s+of\s+law\b/i],
              severityOnFailure: 'high'
            },
            {
              id: 'balancingFactors',
              label: 'Balancing factors considered',
              requirement:
                'Document refers to factors in s 138(3) when exercising the discretion.',
              indicators: [/\bfactor\s+(?:a|b|c|d|e|f|g)\b/i, /\bgravity\b/i, /\bdifficulty\s+of\s+obtaining\b/i],
              severityOnFailure: 'medium'
            }
          ]
        }
      },
      'Criminal Procedure Act 2009 (Vic)': {
        section187: {
          section: 's 187',
          description: 'Prosecution disclosure obligations.',
          sequence: [
            {
              id: 'disclosureTiming',
              label: 'Disclosure timing addressed',
              requirement:
                'Document sets out when disclosure occurred relative to filing hearing or committal mention.',
              indicators: [/\bon\s+or\s+about\s+\d{1,2}\s+\w+\s+\d{4}/i, /\bprior\s+to\s+filing\s+hearing\b/i, /\bcommittal\s+mention\b/i],
              severityOnFailure: 'medium'
            },
            {
              id: 'disclosureScope',
              label: 'Scope of material identified',
              requirement:
                'Document enumerates categories of material disclosed as required by s 187(1).',
              indicators: [/\bwitness\s+statement\b/i, /\bexpert\s+report\b/i, /\bexculpatory\b/i, /\bprosecution\s+brief\b/i],
              severityOnFailure: 'high'
            }
          ]
        }
      }
    }
  },

  utils: {
    normaliseText(text) {
      if (text == null) {
        return '';
      }
      if (typeof text !== 'string') {
        text = String(text);
      }
      return text.replace(/\r\n?/g, '\n').trim();
    },

    tokeniseWords(text) {
      if (!text) return [];
      return text
        .split(/[^A-Za-z0-9']+/)
        .map((token) => token.trim())
        .filter(Boolean);
    },

    tokeniseLines(text) {
      if (!text) return [];
      return text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    },

    matchIndicators(text, indicators) {
      if (!text || !Array.isArray(indicators)) return false;
      return indicators.some((indicator) => {
        if (typeof indicator === 'string') {
          return text.toLowerCase().includes(indicator.toLowerCase());
        }
        if (indicator instanceof RegExp) {
          return indicator.test(text);
        }
        return false;
      });
    },

    findMatches(text, indicators) {
      if (!text || !Array.isArray(indicators)) return [];
      const matches = [];
      for (const indicator of indicators) {
        if (typeof indicator === 'string') {
          if (text.toLowerCase().includes(indicator.toLowerCase())) {
            matches.push(indicator);
          }
        } else if (indicator instanceof RegExp) {
          if (indicator.test(text)) {
            matches.push(indicator.toString());
          }
        }
      }
      return matches;
    }
  },

  runtime: {
    autoApplyToUploads: true,
    analysisHistory: [],

    async processUploadedFile(detail = {}) {
      const { file, text, metadata = {} } = detail;
      let documentText = text;
      if (!documentText && file && typeof file.text === 'function') {
        documentText = await file.text();
      }
      if (!documentText && file && typeof window === 'undefined') {
        // Node.js File/Blob polyfill may expose buffer() method.
        if (typeof file.buffer === 'function') {
          const buffer = await file.buffer();
          documentText = buffer.toString('utf8');
        }
      }
      documentText = ForensicAnalyzerConfig.utils.normaliseText(documentText || '');
      const analysis = this.analyseText(documentText, metadata);
      this.analysisHistory.push({
        timestamp: new Date().toISOString(),
        metadata,
        result: analysis
      });
      this.dispatchAnalysisEvent({ file, metadata, analysis });
      return analysis;
    },

    analyseText(documentText, metadata = {}) {
      const words = ForensicAnalyzerConfig.utils.tokeniseWords(documentText);
      const lines = ForensicAnalyzerConfig.utils.tokeniseLines(documentText);

      const applicableActs = this.identifyApplicableLegislation(documentText);
      const provisionalResults = this.evaluateProvisionalElements(documentText, applicableActs);
      const sequenceResults = this.evaluateStatutorySequences(documentText, lines, applicableActs);

      const summary = this.buildSummary({
        words,
        lines,
        provisionalResults,
        sequenceResults,
        applicableActs,
        metadata
      });

      return {
        metadata,
        counts: {
          words: words.length,
          lines: lines.length
        },
        applicableActs,
        provisionalResults,
        sequenceResults,
        summary
      };
    },

    identifyApplicableLegislation(documentText) {
      const matches = [];
      for (const entry of ForensicAnalyzerConfig.legislationIndex) {
        const matchedAlias = entry.aliases.find((pattern) => {
          if (pattern instanceof RegExp) {
            return pattern.test(documentText);
          }
          return documentText.toLowerCase().includes(String(pattern).toLowerCase());
        });
        if (matchedAlias) {
          matches.push({
            act: entry.act,
            match: matchedAlias instanceof RegExp ? matchedAlias.toString() : String(matchedAlias),
            keySections: entry.keySections,
            summary: entry.summary
          });
        }
      }
      return matches;
    },

    evaluateProvisionalElements(documentText, applicableActs) {
      const results = [];
      const tests = ForensicAnalyzerConfig.tests.provisionalElements;
      if (!tests) return results;

      const includesReasonableBeliefTrigger = /\breasonable\s+belief\b/i.test(documentText);
      const includesReasonableGroundsTrigger = /\breasonable\s+grounds\b/i.test(documentText);

      if (includesReasonableBeliefTrigger && tests.reasonableBelief) {
        results.push(
          this.runReasonableBeliefTest(documentText, ForensicAnalyzerConfig.statutoryTests.reasonableBelief)
        );
      }

      if (includesReasonableGroundsTrigger && tests.reasonableGrounds) {
        results.push(
          this.runReasonableGroundsTest(documentText, ForensicAnalyzerConfig.statutoryTests.reasonableGrounds)
        );
      }

      // If specific acts rely on these provisional elements, ensure they are evaluated.
      for (const act of applicableActs) {
        const sequences = ForensicAnalyzerConfig.tests.statutorySequences[act.act] || {};
        for (const sectionKey of Object.keys(sequences)) {
          const section = sequences[sectionKey];
          if (Array.isArray(section.linkedProvisionalElements)) {
            for (const element of section.linkedProvisionalElements) {
              if (element === 'reasonableBelief') {
                results.push(
                  this.runReasonableBeliefTest(documentText, ForensicAnalyzerConfig.statutoryTests.reasonableBelief, {
                    linkedAct: act.act,
                    linkedSection: section.section
                  })
                );
              }
              if (element === 'reasonableGrounds') {
                results.push(
                  this.runReasonableGroundsTest(documentText, ForensicAnalyzerConfig.statutoryTests.reasonableGrounds, {
                    linkedAct: act.act,
                    linkedSection: section.section
                  })
                );
              }
            }
          }
        }
      }

      return results.filter(Boolean);
    },

    runReasonableBeliefTest(documentText, testDefinition, context = {}) {
      if (!testDefinition) return null;
      const { subjectiveElement, objectiveElement, insufficientGroundsIndicators } = testDefinition;
      const subjectiveMatches = ForensicAnalyzerConfig.utils.findMatches(documentText, [
        ...subjectiveElement.indicators,
        ...(subjectiveElement.regex || [])
      ]);
      const objectiveMatches = ForensicAnalyzerConfig.utils.findMatches(documentText, [
        ...objectiveElement.objectiveFactIndicators,
        ...(objectiveElement.factualBasisRegex || [])
      ]);
      const insufficientMatches = ForensicAnalyzerConfig.utils.findMatches(documentText, insufficientGroundsIndicators);

      const subjectiveSatisfied = subjectiveMatches.length > 0;
      const objectiveSatisfied = objectiveMatches.length > 0;
      const compliant = subjectiveSatisfied && objectiveSatisfied && insufficientMatches.length === 0;

      return {
        id: testDefinition.id,
        name: testDefinition.name,
        context,
        subjectiveSatisfied,
        objectiveSatisfied,
        insufficientMatches,
        subjectiveMatches,
        objectiveMatches,
        compliant,
        severityOnFailure: ForensicAnalyzerConfig.tests.provisionalElements.reasonableBelief.failureSeverity,
        description: ForensicAnalyzerConfig.tests.provisionalElements.reasonableBelief.description
      };
    },

    runReasonableGroundsTest(documentText, testDefinition, context = {}) {
      if (!testDefinition) return null;
      const components = testDefinition.components || {};
      const factualMatches = ForensicAnalyzerConfig.utils.findMatches(documentText, components.factualMatrix?.requiredIndicators || []);
      const objectiveMatches = ForensicAnalyzerConfig.utils.findMatches(documentText, components.objectiveAssessment?.requiredIndicators || []);

      const compliant = factualMatches.length > 0 && objectiveMatches.length > 0;

      return {
        id: testDefinition.id,
        name: testDefinition.name,
        context,
        factualMatches,
        objectiveMatches,
        compliant,
        severityOnFailure: ForensicAnalyzerConfig.tests.provisionalElements.reasonableGrounds.failureSeverity,
        description: ForensicAnalyzerConfig.tests.provisionalElements.reasonableGrounds.description
      };
    },

    evaluateStatutorySequences(documentText, lines, applicableActs) {
      const results = [];
      for (const act of applicableActs) {
        const sections = ForensicAnalyzerConfig.tests.statutorySequences[act.act] || {};
        for (const sectionKey of Object.keys(sections)) {
          const sectionConfig = sections[sectionKey];
          const sequenceResult = this.runSequenceTest(sectionConfig, documentText, lines, {
            act: act.act,
            sectionKey
          });
          results.push(sequenceResult);
        }
      }
      return results;
    },

    runSequenceTest(sectionConfig, documentText, lines, context) {
      const sequenceOutcomes = [];
      for (const step of sectionConfig.sequence) {
        const matches = ForensicAnalyzerConfig.utils.findMatches(documentText, step.indicators);
        const satisfied = matches.length > 0;
        sequenceOutcomes.push({
          id: step.id,
          label: step.label,
          requirement: step.requirement,
          severityOnFailure: step.severityOnFailure,
          matches,
          satisfied
        });
      }

      const failedSteps = sequenceOutcomes.filter((step) => !step.satisfied);
      return {
        act: context.act,
        section: sectionConfig.section,
        description: sectionConfig.description,
        linkedProvisionalElements: sectionConfig.linkedProvisionalElements || [],
        outcomes: sequenceOutcomes,
        failedSteps,
        compliant: failedSteps.length === 0
      };
    },

    buildSummary({ words, lines, provisionalResults, sequenceResults, applicableActs, metadata }) {
      const failedProvisional = provisionalResults.filter((result) => result && !result.compliant);
      const failedSequences = sequenceResults.filter((result) => result && !result.compliant);

      const severityRanking = { critical: 1, high: 2, medium: 3, low: 4 };
      const mostSevere = [...failedProvisional, ...failedSequences.flatMap((seq) => seq.failedSteps.map((step) => ({
        severityOnFailure: step.severityOnFailure,
        description: step.requirement
      })))]
        .map((item) => item.severityOnFailure || 'low')
        .reduce((current, next) => {
          if (!current) return next;
          return severityRanking[next] < severityRanking[current] ? next : current;
        }, null);

      return {
        wordCount: words.length,
        lineCount: lines.length,
        actsConsidered: applicableActs.map((act) => act.act),
        provisionalCompliance: failedProvisional.length === 0,
        statutoryCompliance: failedSequences.length === 0,
        highestSeverity: mostSevere || 'low',
        failedProvisional,
        failedSequences,
        metadata
      };
    },

    dispatchAnalysisEvent(detail) {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('forensic:analysisComplete', {
            detail
          })
        );
      }
    },

    registerUploadListener() {
      if (typeof window === 'undefined') return;
      if (this.__uploadListenerRegistered) return;
      const handler = async (event) => {
        try {
          await this.processUploadedFile(event.detail || {});
        } catch (error) {
          console.error('ForensicAnalyzerConfig upload processing error:', error);
        }
      };
      window.addEventListener('forensic:fileUploaded', handler);
      this.__uploadListenerRegistered = true;
    }
  }
};

// Automatically register upload listener when running in browser environments.
if (typeof window !== 'undefined') {
  window.ForensicAnalyzerConfig = ForensicAnalyzerConfig;
  if (ForensicAnalyzerConfig.runtime.autoApplyToUploads) {
    ForensicAnalyzerConfig.runtime.registerUploadListener();
  }
} else if (typeof global !== 'undefined') {
  module.exports = ForensicAnalyzerConfig;
}

