import React from 'react';

export function CrossReferenceMatrix({ matrix }) {
  if (!matrix?.length) {
    return <p>No cross-references identified.</p>;
  }

  return (
    <section className="cross-reference-matrix">
      <h2>Cross Reference Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Act</th>
            <th>Sections</th>
          </tr>
        </thead>
        <tbody>
          {matrix.map(row => (
            <tr key={row.act}>
              <td>{row.act}</td>
              <td>{row.sections.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
