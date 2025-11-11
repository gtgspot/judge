import assert from 'node:assert/strict';
import { LearningEngine } from '../src/js/learning.js';
import { AnalysisDB } from '../src/js/db.js';

function createDefect({
  defect_type,
  statute,
  statute_name,
  severity,
  description,
  recommendation,
}) {
  return {
    defect_type,
    statute,
    statute_name,
    severity,
    description,
    recommendation,
  };
}

function buildFindings(defects) {
  const phases = { phaseA: [], phaseB: [], phaseC: [] };
  defects.forEach((defect) => {
    if (defect.severity === 'HIGH') {
      phases.phaseA.push(defect);
    } else if (defect.severity === 'MEDIUM') {
      phases.phaseB.push(defect);
    } else {
      phases.phaseC.push(defect);
    }
  });
  return phases;
}

function buildSeveritySummary(defects) {
  return {
    HIGH: defects.filter((defect) => defect.severity === 'HIGH').length,
    MEDIUM: defects.filter((defect) => defect.severity === 'MEDIUM').length,
    LOW: defects.filter((defect) => defect.severity === 'LOW').length,
  };
}

function buildAnalysis(nameSuffix, defects) {
  return {
    fileAName: `Document A ${nameSuffix}`,
    fileBName: `Document B ${nameSuffix}`,
    fileATypes: ['Report'],
    fileBTypes: ['Transcript'],
    fileAContent: 'Sample content',
    fileBContent: 'Additional content',
    defects,
    findings: buildFindings(defects),
    severity_summary: buildSeveritySummary(defects),
    documentTypes: ['Report', 'Transcript'],
  };
}

async function main() {
  await LearningEngine.initialize();
  if (AnalysisDB.clearAll) {
    await AnalysisDB.clearAll();
  }

  const recurringDefectFactory = () =>
    createDefect({
      defect_type: 'Missing s.55D directions language',
      statute: 's.55D RSA',
      statute_name: 'Road Safety Act s.55D',
      severity: 'HIGH',
      description: 'Directions omit legally mandated phrasing.',
      recommendation: 'Introduce checklist ensuring phrasing compliance.',
    });

  const novelDefectFactory = () =>
    createDefect({
      defect_type: 'Lack of rights to counsel advisement',
      statute: 'Charter s.10(b)',
      statute_name: 'Canadian Charter of Rights and Freedoms s.10(b)',
      severity: 'HIGH',
      description: 'No documentation of counsel advisement provided.',
      recommendation: 'Record advisement timing and subject response.',
    });

  const result1 = await LearningEngine.recordAnalysis(buildAnalysis('1', [recurringDefectFactory()]));
  assert.equal(result1.record.id, 1, 'first analysis should be stored with id 1');

  const result2 = await LearningEngine.recordAnalysis(buildAnalysis('2', [recurringDefectFactory()]));
  assert.equal(result2.record.id, 2, 'second analysis should be stored with id 2');

  const result3 = await LearningEngine.recordAnalysis(buildAnalysis('3', [recurringDefectFactory()]));
  assert.equal(result3.record.id, 3, 'third analysis should be stored with id 3');

  assert.ok(result3.crossAnalysis.recurring.length > 0, 'recurring defect should be detected');
  const recurringEntry = result3.crossAnalysis.recurring.find(
    (entry) => entry.defect.defect_type === 'Missing s.55D directions language'
  );
  assert.ok(recurringEntry, 'recurring defect entry should exist');
  assert.equal(recurringEntry.occurrences, 3, 'recurring defect should show three occurrences');

  const patterns = await LearningEngine.generatePatternHighlights();
  const patternSummary = patterns.recurring.find(
    (pattern) => pattern.defect_type === 'Missing s.55D directions language'
  );
  assert.ok(patternSummary, 'pattern summary should include recurring defect');
  assert.equal(patternSummary.occurrence_count, 3, 'pattern summary occurrence count should match analyses');

  const statuteSummary = patterns.statutes.find((statute) => statute.reference === 's.55D RSA');
  assert.ok(statuteSummary, 'statute summary should include the recorded statute');
  assert.equal(statuteSummary.times_encountered, 3, 'statute occurrence count should match recorded defects');

  const timelineByStatute = await LearningEngine.getTimelineData({ statute: 's.55D RSA' });
  assert.equal(timelineByStatute.length, 3, 'timeline filter by statute should return three analyses');

  const timelineBySeverity = await LearningEngine.getTimelineData({ severity: 'HIGH' });
  assert.equal(timelineBySeverity.length, 3, 'timeline filter by severity should return three analyses');

  const filters = await LearningEngine.getFilterOptions();
  assert.ok(filters.statutes.includes('s.55D RSA'), 'filters should include statute option');
  assert.ok(
    filters.defects.includes('Missing s.55D directions language'),
    'filters should include defect option'
  );

  const insightsAfterThird = await LearningEngine.generateInsights(result3);
  assert.equal(insightsAfterThird.totalAnalyses, 3, 'insights should reflect three analyses');
  assert.equal(insightsAfterThird.totalDefects, 3, 'insights should reflect total defects found');
  assert.equal(insightsAfterThird.newIssues, 0, 'no novel issues expected before fourth analysis');
  assert.equal(
    insightsAfterThird.mostCommonIssue.defectType,
    'Missing s.55D directions language',
    'most common issue should match recurring defect'
  );

  const result4 = await LearningEngine.recordAnalysis(
    buildAnalysis('4', [recurringDefectFactory(), novelDefectFactory()])
  );

  const recurringAfterFourth = result4.crossAnalysis.recurring.find(
    (entry) => entry.defect.defect_type === 'Missing s.55D directions language'
  );
  assert.ok(recurringAfterFourth, 'recurring defect should persist after fourth analysis');
  assert.equal(recurringAfterFourth.occurrences, 4, 'occurrence count should increase with fourth analysis');

  const novelIssue = result4.crossAnalysis.novel.find(
    (entry) => entry.defect.defect_type === 'Lack of rights to counsel advisement'
  );
  assert.ok(novelIssue, 'novel issue should be identified on fourth analysis');

  const insightsAfterFourth = await LearningEngine.generateInsights(result4);
  assert.equal(insightsAfterFourth.totalAnalyses, 4, 'insights should reflect four analyses');
  assert.equal(insightsAfterFourth.totalDefects, 5, 'total defects should include recurring and novel issues');
  assert.equal(insightsAfterFourth.newIssues, 1, 'one novel issue expected on fourth analysis');

  const counselTimeline = await LearningEngine.getTimelineData({
    defectType: 'Lack of rights to counsel advisement',
  });
  assert.equal(counselTimeline.length, 1, 'timeline filter by novel defect should return one analysis');

  console.log('All learning-engine tests passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
