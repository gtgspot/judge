import { VictorianStatuteAnalyzer } from './VictorianStatuteAnalyzer.js';

export class CrossReferenceEngine {
  constructor(statuteAnalyzer = new VictorianStatuteAnalyzer()) {
    this.statuteAnalyzer = statuteAnalyzer;
  }

  async init() {
    if (!this.statuteAnalyzer.statutes) {
      await this.statuteAnalyzer.init();
    }
  }

  buildReferenceMatrix(documentText) {
    const references = this.statuteAnalyzer.extractReferences(documentText);
    const governingActs = this.statuteAnalyzer.identifyGoverningActs(references);

    return governingActs.map(actName => {
      const act = this.statuteAnalyzer.statutes[actName];
      const relatedSections = references
        .map(ref => this.statuteAnalyzer.extractSectionNumber(ref))
        .filter(section => act.sections?.[section]);

      return {
        act: actName,
        sections: Array.from(new Set(relatedSections))
      };
    });
  }
}
