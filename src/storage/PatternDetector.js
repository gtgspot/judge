export class PatternDetector {
  constructor() {
    this.patterns = new Map();
  }

  recordIssue(issue) {
    const key = `${issue.type}:${issue.element}`;
    const existing = this.patterns.get(key) || { count: 0, consequences: new Set() };
    existing.count += 1;
    if (issue.consequence) {
      existing.consequences.add(issue.consequence);
    }
    this.patterns.set(key, existing);
  }

  summarize() {
    return Array.from(this.patterns.entries()).map(([key, value]) => {
      const [type, element] = key.split(':');
      return {
        type,
        element,
        occurrences: value.count,
        consequences: Array.from(value.consequences)
      };
    });
  }
}
