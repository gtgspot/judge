import { VictorianStatuteAnalyzer } from './VictorianStatuteAnalyzer.js';

export class InterpretationEngine {
  constructor(statuteAnalyzer = new VictorianStatuteAnalyzer()) {
    this.statuteAnalyzer = statuteAnalyzer;
    this.initialization = null;
  }

  async init() {
    if (!this.initialization) {
      this.initialization = this.statuteAnalyzer.init();
    }
    await this.initialization;
  }

  interpret(documentText) {
    if (!this.statuteAnalyzer.statutes) {
      return [];
    }

    const normalizedText = typeof documentText === 'string' ? documentText : '';
    const references = this.statuteAnalyzer.extractReferences(normalizedText);
    const governingActs = this.statuteAnalyzer.identifyGoverningActs(references);

    return references.map(reference => {
      const sectionNumber = this.statuteAnalyzer.extractSectionNumber(reference);
      const interpretations = governingActs
        .map(actName => {
          const section = this.statuteAnalyzer.statutes[actName].sections?.[sectionNumber];
          if (!section) {
            return null;
          }

          const subsectionSummaries = section.subsections
            ? Object.values(section.subsections).map(sub => sub.full_text)
            : null;

          return {
            act: actName,
            section: sectionNumber,
            title: section.title || '',
            notes: subsectionSummaries || section.rule || section.presumption || section.discretion || section.mandatory_disclosures || section.conditions || null
          };
        })
        .filter(Boolean);

      return {
        reference,
        interpretations
      };
    });
  }
}
