export class VictorianStatuteAnalyzer {
  constructor() {
    this.statutes = null;
  }

  async init() {
    const response = await fetch('/src/data/victorianStatutes.json');
    this.statutes = await response.json();
  }

  // Check if document text satisfies statutory requirements
  checkCompliance(documentText, actName, sectionNumber) {
    const section = this.statutes[actName].sections[sectionNumber];
    const results = {
      section: sectionNumber,
      title: section.title,
      compliant: true,
      satisfied: [],
      missing: [],
      consequences: []
    };

    // Check each element
    Object.values(section.subsections || {}).forEach(subsection => {
      subsection.elements?.forEach(element => {
        const found = this.searchForElement(documentText, element);

        if (found.present) {
          results.satisfied.push({
            element: element.name,
            evidence: found.evidence
          });
        } else {
          results.compliant = false;
          results.missing.push({
            element: element.name,
            required: element.required,
            consequence: element.absence_consequence
          });
          if (element.absence_consequence) {
            results.consequences.push(element.absence_consequence);
          }
        }
      });
    });

    return results;
  }

  searchForElement(text, element) {
    const textLower = text.toLowerCase();
    const results = {
      present: false,
      evidence: []
    };

    // Search for keywords
    if (element.keywords) {
      element.keywords.forEach(keyword => {
        const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          results.present = true;
          results.evidence.push(...matches);
        }
      });
    }

    // Search for specific grounds list
    if (element.grounds_list) {
      element.grounds_list.forEach(ground => {
        if (textLower.includes(ground.toLowerCase())) {
          results.present = true;
          results.evidence.push(ground);
        }
      });
    }

    return results;
  }

  // Extract all statutory references from text
  extractReferences(text) {
    const patterns = [
      /section\s+\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi,
      /s\.\s*\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi,
      /s\s+\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi
    ];

    const found = new Set();
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(m => found.add(m));
      }
    });

    return Array.from(found);
  }

  // Identify which Acts govern this document
  identifyGoverningActs(references) {
    const acts = new Set();

    references.forEach(ref => {
      const sectionNum = this.extractSectionNumber(ref);

      // Check each act in database
      Object.keys(this.statutes).forEach(actName => {
        if (this.statutes[actName].sections?.[sectionNum]) {
          acts.add(actName);
        }
      });
    });

    return Array.from(acts);
  }

  extractSectionNumber(reference) {
    const match = reference.match(/\d+[A-Z]?/);
    return match ? match[0] : null;
  }
}
