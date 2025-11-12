import { VictorianStatuteAnalyzer } from '../analyzers/VictorianStatuteAnalyzer.js';

const analyzer = new VictorianStatuteAnalyzer();
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await analyzer.init();
    initialized = true;
  }
}

export async function parseStatutoryReferences(text) {
  await ensureInitialized();
  return analyzer.extractReferences(text);
}

export async function identifyActs(text) {
  await ensureInitialized();
  const references = analyzer.extractReferences(text);
  return analyzer.identifyGoverningActs(references);
}
