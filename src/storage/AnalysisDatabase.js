function createIdentifier() {
  const cryptoImpl = globalThis.crypto;
  if (cryptoImpl?.randomUUID) {
    return cryptoImpl.randomUUID();
  }
  return `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class AnalysisDatabase {
  constructor() {
    this.initialized = false;
    this.records = [];
  }

  async init() {
    this.initialized = true;
  }

  async saveAnalysis(analysis) {
    if (!this.initialized) {
      throw new Error('AnalysisDatabase not initialized');
    }
    const entry = {
      id: createIdentifier(),
      createdAt: new Date().toISOString(),
      ...analysis
    };
    this.records.push(entry);
    return entry;
  }

  async listAnalyses() {
    if (!this.initialized) {
      throw new Error('AnalysisDatabase not initialized');
    }
    return [...this.records];
  }
}
