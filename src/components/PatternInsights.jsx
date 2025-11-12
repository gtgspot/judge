import React from 'react';

export function PatternInsights({ insights }) {
  if (!insights?.length) {
    return <p>No recurring patterns detected.</p>;
  }

  return (
    <section className="pattern-insights">
      <h2>Pattern Insights</h2>
      <ul>
        {insights.map(pattern => (
          <li key={`${pattern.type}-${pattern.element}`}>
            <strong>{pattern.type}</strong> — {pattern.element}
            <span> ({pattern.occurrences} occurrences)</span>
            {pattern.consequences?.length > 0 && (
              <em> Consequences: {pattern.consequences.join(', ')}</em>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
