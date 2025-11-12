import React from 'react';

export function AnalysisResults({ results }) {
  if (!results) {
    return <p>No analysis available.</p>;
  }

  return (
    <section className="analysis-results">
      <h2>Analysis Overview</h2>
      <p>Word count: {results.wordCount}</p>
      <p>Line count: {results.lineCount}</p>

      <h3>Statutory References</h3>
      <ul>
        {results.statutoryReferences.map(reference => (
          <li key={reference}>{reference}</li>
        ))}
      </ul>

      <h3>Issues</h3>
      <ul>
        {results.issues.map(issue => (
          <li key={`${issue.type}-${issue.element}-${issue.line || 'unknown'}`}>
            <strong>{issue.type}</strong>: {issue.description}
            {issue.consequence && <em> — {issue.consequence}</em>}
            {issue.line && <span> (line {issue.line})</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
