import { VictorianStatuteAnalyzer } from './VictorianStatuteAnalyzer.js';

const statuteAnalyzer = new VictorianStatuteAnalyzer();
await statuteAnalyzer.init();

function createPreset(name, issueType = 'Statutory Non-Compliance') {
  return {
    name,
    async analyze(documentText) {
      const references = statuteAnalyzer.extractReferences(documentText);
      const governingActs = statuteAnalyzer.identifyGoverningActs(references);

      const complianceChecks = [];
      references.forEach(ref => {
        const sectionNum = statuteAnalyzer.extractSectionNumber(ref);
        governingActs.forEach(act => {
          const statute = statuteAnalyzer.statutes[act];
          if (statute?.sections?.[sectionNum]) {
            const result = statuteAnalyzer.checkCompliance(documentText, act, sectionNum);
            complianceChecks.push(result);
          }
        });
      });

      const issues = [];
      complianceChecks.forEach(check => {
        if (!check.compliant) {
          check.missing.forEach(missing => {
            issues.push({
              severity: missing.required ? 'HIGH' : 'MEDIUM',
              type: issueType,
              statute: `${check.section} ${check.title}`,
              element: missing.element,
              description: `Missing required element: ${missing.element}`,
              consequence: missing.consequence,
              line: this.findLineNumber(documentText, missing.element)
            });
          });
        }
      });

      return {
        statutoryReferences: references,
        governingActs,
        complianceChecks,
        issues,
        wordCount: documentText.split(/\s+/).length,
        lineCount: documentText.split('\n').length
      };
    },

    findLineNumber(text, searchTerm) {
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].toLowerCase().includes(searchTerm.toLowerCase())) {
          return i + 1;
        }
      }
      return null;
    }
  };
}

export const Preset1_StatutoryProcedural = createPreset('Statutory Procedural Analysis');
export const Preset2_EvidentiaryIntegrity = createPreset('Evidentiary Integrity Review', 'Evidentiary Concern');
export const Preset3_DisclosureCompliance = createPreset('Disclosure Compliance Audit', 'Disclosure Non-Compliance');
export const Preset4_BreathTestingValidity = createPreset('Breath Testing Validity Check', 'Breath Test Non-Compliance');
export const Preset5_DirectionProtocol = createPreset('Direction Protocol Assessment', 'Procedural Non-Compliance');
export const Preset6_DeviceMaintenance = createPreset('Device Maintenance Verification', 'Instrumentation Risk');
export const Preset7_JurisdictionalScan = createPreset('Jurisdictional Coverage Scan', 'Jurisdictional Gap');
export const Preset8_ComprehensiveRisk = createPreset('Comprehensive Statutory Risk Review', 'Statutory Risk');
