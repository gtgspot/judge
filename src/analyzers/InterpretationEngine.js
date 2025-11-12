import { VictorianStatuteAnalyzer } from './VictorianStatuteAnalyzer.js';

export class InterpretationEngine {
  constructor(statuteAnalyzer = new VictorianStatuteAnalyzer()) {
    this.statuteAnalyzer = statuteAnalyzer;
  }

  async init() {
    if (!this.statuteAnalyzer.statutes) {
      await this.statuteAnalyzer.init();
    }
  }

  interpret(documentText) {
    const references = this.statuteAnalyzer.extractReferences(documentText);
    const governingActs = this.statuteAnalyzer.identifyGoverningActs(references);

    return references.map(reference => {
      const sectionNumber = this.statuteAnalyzer.extractSectionNumber(reference);
      const interpretations = governingActs
        .map(actName => {
          const section = this.statuteAnalyzer.statutes[actName].sections?.[sectionNumber];
          if (!section) {
            return null;
          }

          return {
            act: actName,
            section: sectionNumber,
            title: section.title,
            notes: section.subsections
              ? Object.values(section.subsections).map(sub => sub.full_text)
              : section.rule || section.presumption || section.discretion
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
