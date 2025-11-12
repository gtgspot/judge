export function classifyDefects(issues) {
  return issues.map(issue => {
    let category = 'General';
    if (issue.type.includes('Disclosure')) {
      category = 'Disclosure';
    } else if (issue.type.includes('Evidentiary')) {
      category = 'Evidence';
    } else if (issue.type.includes('Jurisdiction')) {
      category = 'Jurisdiction';
    } else if (issue.type.includes('Device')) {
      category = 'Instrumentation';
    }

    return {
      ...issue,
      category
    };
  });
}
