import { VictorianStatuteAnalyzer } from './VictorianStatuteAnalyzer.js';

export class CrossReferenceEngine {
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

  buildReferenceMatrix(documentText) {
    if (!this.statuteAnalyzer.statutes) {
      return [];
    }
    const normalizedText = typeof documentText === 'string' ? documentText : '';
    const references = this.statuteAnalyzer.extractReferences(normalizedText);
    const governingActs = this.statuteAnalyzer.identifyGoverningActs(references);

    return governingActs.map(actName => {
      const act = this.statuteAnalyzer.statutes[actName];
      const relatedSections = references
        .map(ref => this.statuteAnalyzer.extractSectionNumber(ref))
        .filter(section => section && act.sections?.[section]);

      return {
        act: actName,
        sections: Array.from(new Set(relatedSections))
      };
    });
  }
}
