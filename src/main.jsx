import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { VictorianStatuteAnalyzer } from './analyzers/VictorianStatuteAnalyzer.js';
import * as Presets from './analyzers/PresetAnalyzers.js';
import { AnalysisDatabase } from './storage/AnalysisDatabase.js';
import { PatternDetector } from './storage/PatternDetector.js';
import { TimelineManager } from './storage/TimelineManager.js';
import { FileUploader } from './components/FileUploader.jsx';
import { AnalysisResults } from './components/AnalysisResults.jsx';
import { DefectTimeline } from './components/DefectTimeline.jsx';
import { CrossReferenceMatrix } from './components/CrossReferenceMatrix.jsx';
import { PatternInsights } from './components/PatternInsights.jsx';
import { extractTextFromFile } from './utils/textExtractor.js';
import { classifyDefects } from './utils/defectClassifier.js';
import { exportAnalysisToCSV, exportAnalysisToJSON } from './utils/exportManager.js';
import { CrossReferenceEngine } from './analyzers/CrossReferenceEngine.js';
import { InterpretationEngine } from './analyzers/InterpretationEngine.js';

const statuteAnalyzer = new VictorianStatuteAnalyzer();
const database = new AnalysisDatabase();
const patternDetector = new PatternDetector();
const timelineManager = new TimelineManager();
const crossReferenceEngine = new CrossReferenceEngine(statuteAnalyzer);
const interpretationEngine = new InterpretationEngine(statuteAnalyzer);

async function initializeApp() {
  await statuteAnalyzer.init();
  await database.init();
  await crossReferenceEngine.init();
  await interpretationEngine.init();
  console.log('✅ Application initialized with Victorian statute database');
}

const appInitialization = initializeApp().catch(error => {
  console.error('❌ Failed to initialize application', error);
  throw error;
});

function App() {
  const [selectedPresetKey, setSelectedPresetKey] = useState(Object.keys(Presets)[0]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [interpretations, setInterpretations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const presetList = useMemo(() => Object.entries(Presets), []);

  useEffect(() => {
    setMatrix([]);
    setInterpretations([]);
  }, [selectedPresetKey]);

  const runAnalysis = async documentText => {
    setLoading(true);
    setError(null);
    try {
      await appInitialization;
      if (!documentText) {
        throw new Error('No document text provided for analysis.');
      }
      const preset = Presets[selectedPresetKey];
      if (!preset) {
        throw new Error('Selected preset is unavailable.');
      }
      const result = await preset.analyze(documentText);
      const classifiedIssues = classifyDefects(result.issues);
      const enrichedResult = { ...result, issues: classifiedIssues };
      setAnalysisResult(enrichedResult);

      classifiedIssues.forEach(issue => patternDetector.recordIssue(issue));
      setPatterns(patternDetector.summarize());

      const analysisRecord = await database.saveAnalysis({
        preset: preset.name,
        result: enrichedResult
      });

      timelineManager.addEvent({
        timestamp: analysisRecord.createdAt,
        summary: `Ran ${preset.name}`,
        details: `${classifiedIssues.length} issues identified`
      });
      setTimeline(timelineManager.getTimeline());

      setMatrix(crossReferenceEngine.buildReferenceMatrix(documentText));
      setInterpretations(interpretationEngine.interpret(documentText));
    } catch (runError) {
      console.error('Failed to run analysis', runError);
      setError(runError instanceof Error ? runError.message : 'Unknown error occurred while running analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async file => {
    try {
      const text = await extractTextFromFile(file);
      await runAnalysis(text);
    } catch (uploadError) {
      console.error('Failed to process uploaded file', uploadError);
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to read the uploaded file.');
    }
  };

  const handleExportJSON = () => {
    if (analysisResult) {
      exportAnalysisToJSON(analysisResult);
    }
  };

  const handleExportCSV = () => {
    if (analysisResult) {
      exportAnalysisToCSV(analysisResult);
    }
  };

  return (
    <main>
      <header>
        <h1>Victorian Statute Compliance Analyzer</h1>
        <p>Select a preset and upload a document to begin analysis.</p>
      </header>

      <section className="preset-selection">
        <label htmlFor="preset">Preset</label>
        <select
          id="preset"
          value={selectedPresetKey}
          onChange={event => setSelectedPresetKey(event.target.value)}
        >
          {presetList.map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.name}
            </option>
          ))}
        </select>
      </section>

      <FileUploader onUpload={handleFileUpload} />

      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}

      <section className="analysis-actions">
        <button type="button" onClick={handleExportJSON} disabled={!analysisResult}>
          Export JSON
        </button>
        <button type="button" onClick={handleExportCSV} disabled={!analysisResult}>
          Export CSV
        </button>
        {loading && <span className="status">Analyzing...</span>}
      </section>

      <AnalysisResults results={analysisResult} />
      <CrossReferenceMatrix matrix={matrix} />

      <section className="interpretations">
        <h2>Interpretation Notes</h2>
        <ul>
          {interpretations.map(item => (
            <li key={item.reference}>
              <strong>{item.reference}</strong>
              <ul>
                {item.interpretations.map(entry => (
                  <li key={`${entry.act}-${entry.section}`}>
                    {entry.act} — {entry.section}: {entry.title}
                    {Array.isArray(entry.notes) ? (
                      <ul>
                        {entry.notes.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    ) : entry.notes ? (
                      <p>{entry.notes}</p>
                    ) : (
                      <p>No interpretive guidance available.</p>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <DefectTimeline timeline={timeline} />
      <PatternInsights insights={patterns} />
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
