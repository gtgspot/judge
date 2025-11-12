import { VictorianStatuteAnalyzer } from '../analyzers/VictorianStatuteAnalyzer.js';

const analyzer = new VictorianStatuteAnalyzer();
let initializationPromise;

async function ensureInitialized() {
  if (analyzer.statutes) {
    return;
  }
  if (!initializationPromise) {
    initializationPromise = analyzer.init();
  }
  await initializationPromise;
}

export async function parseStatutoryReferences(text) {
  await ensureInitialized();
  const normalizedText = typeof text === 'string' ? text : '';
  return analyzer.extractReferences(normalizedText);
}

export async function identifyActs(text) {
  await ensureInitialized();
  const normalizedText = typeof text === 'string' ? text : '';
  const references = analyzer.extractReferences(normalizedText);
  return analyzer.identifyGoverningActs(references);
}
