import statutesData from '../data/victorianStatutes.json';

export class VictorianStatuteAnalyzer {
  constructor() {
    this.statutes = null;
  }

  async init() {
    if (!this.statutes) {
      this.statutes = statutesData;
    }
    return this.statutes;
  }

  ensureInitialized() {
    if (!this.statutes) {
      throw new Error('VictorianStatuteAnalyzer has not been initialized');
    }
  }

  // Check if document text satisfies statutory requirements
  checkCompliance(documentText, actName, sectionNumber) {
    this.ensureInitialized();

    const act = this.statutes?.[actName];
    const section = act?.sections?.[sectionNumber];

    if (!act || !section) {
      return null;
    }

    const normalizedText = typeof documentText === 'string' ? documentText : '';

    const results = {
      section: sectionNumber,
      title: section.title || '',
      compliant: true,
      satisfied: [],
      missing: [],
      consequences: []
    };

    // Check each element
    Object.values(section.subsections || {}).forEach(subsection => {
      subsection.elements?.forEach(element => {
        const found = this.searchForElement(normalizedText, element);

        if (found.present) {
          results.satisfied.push({
            element: element.name,
            evidence: found.evidence
          });
        } else {
          results.compliant = element.required ? false : results.compliant;
          results.missing.push({
            element: element.name,
            required: Boolean(element.required),
            consequence: element.absence_consequence || null
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
    if (Array.isArray(element.keywords)) {
      element.keywords.forEach(keyword => {
        if (!keyword) {
          return;
        }
        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`.{0,100}${escapedKeyword}.{0,100}`, 'gi');
        const matches = text.match(regex);
        if (matches) {
          results.present = true;
          results.evidence.push(...matches);
        }
      });
    }

    // Search for specific grounds list
    if (Array.isArray(element.grounds_list)) {
      element.grounds_list.forEach(ground => {
        if (textLower.includes(String(ground).toLowerCase())) {
          results.present = true;
          results.evidence.push(ground);
        }
      });
    }

    return results;
  }

  // Extract all statutory references from text
  extractReferences(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return [];
    }

    const patterns = [
      /section\s+\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi,
      /s\.\s*\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi,
      /s\s+\d+[A-Z]?(?:\(\d+\))?(?:\([a-z]\))?/gi
    ];

    const found = new Set();
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => found.add(match));
      }
    });

    return Array.from(found);
  }

  // Identify which Acts govern this document
  identifyGoverningActs(references) {
    this.ensureInitialized();

    if (!Array.isArray(references) || references.length === 0) {
      return [];
    }

    const acts = new Set();

    references.forEach(ref => {
      const sectionNum = this.extractSectionNumber(ref);

      if (!sectionNum) {
        return;
      }

      // Check each act in database
      Object.keys(this.statutes).forEach(actName => {
        const act = this.statutes[actName];
        if (act?.sections?.[sectionNum]) {
          acts.add(actName);
        }
      });
    });

    return Array.from(acts);
  }

  extractSectionNumber(reference) {
    if (typeof reference !== 'string') {
      return null;
    }
    const match = reference.match(/\d+[A-Z]?/);
    return match ? match[0] : null;
  }
}
