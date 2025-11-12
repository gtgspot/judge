export function exportAnalysisToJSON(analysis) {
  const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
  triggerDownload(blob, 'analysis.json');
}

export function exportAnalysisToCSV(analysis) {
  const headers = ['Type', 'Element', 'Description', 'Consequence', 'Line'];
  const rows = analysis.issues.map(issue => [
    issue.type,
    issue.element,
    issue.description,
    issue.consequence || '',
    issue.line || ''
  ]);

  const csvContent = [headers, ...rows].map(row => row.map(value => `"${value}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  triggerDownload(blob, 'analysis.csv');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
