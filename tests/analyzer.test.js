const test = require('node:test');
const assert = require('node:assert/strict');
const Analyzer = require('../scripts/analyzer.js');

test('runAllPresets returns structured results for each preset', () => {
  const docs = Analyzer.SAMPLE_DOCUMENTS.map((doc, index) => ({
    ...doc,
    id: `doc-${index}`
  }));
  const results = Analyzer.runAllPresets(docs);
  assert.equal(results.length, Analyzer.PRESETS.length);
  results.forEach(result => {
    assert.ok(result.title, 'each preset exposes a title');
    assert.ok(Array.isArray(result.results), 'preset results should be an array');
    result.results.forEach(entry => {
      assert.ok(typeof entry.wordCount === 'number');
      assert.ok(typeof entry.lineCount === 'number');
      assert.ok(Array.isArray(entry.keyTerms));
      assert.ok(Array.isArray(entry.statutoryReferences));
      assert.ok(Array.isArray(entry.issues));
    });
  });
});

test('extractStatutoryReferences identifies Victorian references', () => {
  const references = Analyzer.extractStatutoryReferences(
    'Pursuant to Section 55D and s.49(1)(a) plus obligations in Part 3.3.'
  );
  assert.ok(references.includes('Section 55D'));
  assert.ok(references.includes('s.49(1)(a)'));
  assert.ok(references.includes('Part 3.3'));
});

test('analyseEvidentiary flags missing evidentiary requirements', () => {
  const result = Analyzer.analyseEvidentiary({
    text: 'Brief asserting compliance with section 49(1) only.'
  });
  assert.ok(
    result.issues.some(issue => issue.description.includes('section 55d not identified')),
    'should highlight missing section 55d reference'
  );
  assert.ok(
    result.issues.some(issue => issue.description.includes('section 55e not identified')),
    'should highlight missing section 55e reference'
  );
});

test('analyseComparative warns when insufficient documents are supplied', () => {
  const result = Analyzer.analyseComparative([
    { name: 'Document A', text: 'Single document only.' }
  ]);
  assert.equal(result.issues[0].description.includes('At least two documents'), true);
});
