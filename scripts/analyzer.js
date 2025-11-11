(function (globalThis, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    globalThis.Analyzer = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function factory() {
  const LEGAL_FRAMEWORKS = [
    {
      title: "Magistrates' Court Act 1989 (Vic)",
      focus: [
        'Jurisdictional basis for summary proceedings',
        "Procedural governance for Victorian Magistrates' Court"
      ]
    },
    {
      title: 'Criminal Procedure Act 2009 (Vic)',
      focus: [
        'Part 3.3 - Disclosure obligations',
        'Section 185 - Defence disclosure requirements',
        'Section 187 - Prosecution disclosure requirements'
      ]
    },
    {
      title: 'Evidence Act 2008 (Vic)',
      focus: [
        'Chapter 2 - Admissibility rules',
        'Chapter 3 - Hearsay rule analysis',
        'Sections 137-138 - Discretions to exclude evidence'
      ]
    },
    {
      title: 'Road Safety Act 1986 (Vic)',
      focus: [
        'Section 49(1)(a)-(h) preliminary breath/oral fluid test requirements',
        'Section 55D - Authority and conditions for preliminary tests',
        'Section 55E - Proper performance requirements',
        'Section 55(1) - Evidentiary test requirements'
      ]
    }
  ];

  const KEY_LEGAL_TERMS = [
    'disclosure',
    'admissibility',
    'hearsay',
    'prosecution',
    'defence',
    "magistrates' court",
    'victoria',
    'reasonable',
    'authority',
    'jurisdiction',
    'breath test',
    'oral fluid',
    'evidentiary',
    'preliminary',
    'section 185',
    'section 187',
    'section 49',
    'section 55d',
    'section 55e',
    'section 55',
    'section 137',
    'section 138',
    'chapter 2',
    'chapter 3',
    'magistrate',
    'informant',
    'member',
    'officer'
  ];

  const LATIN_MAXIMS = [
    'mens rea',
    'actus reus',
    'prima facie',
    'de facto',
    'ipso facto',
    'inter alia',
    'bona fide',
    'ultra vires',
    'audi alteram partem',
    'res gestae'
  ];

  const SAMPLE_DOCUMENTS = [
    {
      name: "Sample Charge Statement (Document A)",
      text: `Summary of Evidence - Magistrates' Court at Melbourne\n\nOn 14 March 2023 at 21:35 hours the informant Senior Constable Rivera conducted a preliminary breath test pursuant to section 49(1)(b) Road Safety Act 1986 (Vic). The accused stated that he believed the device was not properly calibrated. The officer formed the opinion that the requirements of section 55D were satisfied before directing an evidentiary breath test under section 55(1). Disclosure material provided to the defence references the Criminal Procedure Act 2009 (Vic) Part 3.3. The prosecution shall tender calibration records and asserts that all procedures were performed in accordance with section 55E. Evidence is sought to be led notwithstanding potential exclusion under sections 137-138 of the Evidence Act 2008 (Vic).`
    },
    {
      name: "Sample Defence Response (Document B)",
      text: `Defence Response - Magistrates' Court Act 1989 (Vic) proceeding\n\nThe defence contends that before the preliminary breath test the member lacked authority under section 55D Road Safety Act 1986 because the accused was already at home. The accused says he was informed only after the test that refusal may be an offence, contrary to section 49(1)(f). Defence disclosure under section 185 Criminal Procedure Act 2009 identifies potential hearsay witnesses and raises the hearsay rule in Chapter 3 of the Evidence Act 2008. It is believed the prosecution did not provide all required materials and there may be non-compliance with section 187. The defence may have difficulty accepting the prosecution assertion that the instrument was operated in strict compliance with section 55E.`
    }
  ];

  function normaliseText(text) {
    return text.toLowerCase();
  }

  function countWords(text) {
    const matches = text.match(/\b[\w']+\b/g);
    return matches ? matches.length : 0;
  }

  function splitLines(text) {
    if (!text) return [];
    return text.replace(/\r\n/g, '\n').split('\n');
  }

  function getLineNumber(text, index) {
    const upToIndex = text.slice(0, index);
    return upToIndex.split(/\n/).length;
  }

  function getContext(text, startIndex, length) {
    const CONTEXT_SIZE = 50;
    const begin = Math.max(0, startIndex - CONTEXT_SIZE);
    const end = Math.min(text.length, startIndex + length + CONTEXT_SIZE);
    return text.slice(begin, end).replace(/\s+/g, ' ');
  }

  function dedupe(list) {
    return Array.from(new Set(list.map(item => (typeof item === 'string' ? item.trim() : item)))).filter(Boolean);
  }

  function extractStatutoryReferences(text) {
    const refs = [];
    const patterns = [
      /(section\s+\d+[A-Za-z]*\s*(?:\([^)]+\))*)/gi,
      /(s\.\s*\d+[A-Za-z]*\s*(?:\([^)]+\))*)/gi,
      /(part\s+\d+\.\d+)/gi
    ];
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[0].replace(/\s+/g, ' ').trim();
        refs.push(value);
      }
    });
    return dedupe(refs);
  }

  function registerMatches({ text, pattern, label, severity = 'LOW' }) {
    const issues = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const index = match.index;
      const found = match[0];
      issues.push({
        description: `${label}: ${found}`,
        severity,
        line: getLineNumber(text, index),
        context: getContext(text, index, found.length)
      });
    }
    return issues;
  }

  function extractKeyLegalTerms(text) {
    const lower = normaliseText(text);
    const matches = KEY_LEGAL_TERMS.filter(term => lower.includes(term));
    return dedupe(matches.map(term => term.replace(/\b\w/g, c => c.toUpperCase())));
  }

  function extractDatesTimesLocations(text) {
    const issues = [];
    const datePatterns = [
      /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
    ];
    const timePatterns = [
      /\b\d{1,2}:\d{2}(?:\s?(?:AM|PM))?\b/gi,
      /\b\d{1,2}\s?(?:AM|PM)\b/gi
    ];
    const locationPattern = /(at|in)\s+([A-Z][\w\s'-]{2,})/g;

    datePatterns.forEach(pattern => {
      issues.push(...registerMatches({ text, pattern, label: 'Date reference', severity: 'LOW' }));
    });
    timePatterns.forEach(pattern => {
      issues.push(...registerMatches({ text, pattern, label: 'Time reference', severity: 'LOW' }));
    });

    let match;
    while ((match = locationPattern.exec(text)) !== null) {
      const found = match[0];
      const index = match.index;
      issues.push({
        description: `Location reference: ${found}`,
        severity: 'LOW',
        line: getLineNumber(text, index),
        context: getContext(text, index, found.length)
      });
    }
    return issues;
  }

  function analyseStatutory(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(must|shall|required)\b/gi,
        label: 'Mandatory procedural language',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(jurisdiction|authority|empowered|entitled)\b/gi,
        label: 'Jurisdictional reference',
        severity: 'HIGH'
      })
    );
    issues.push(...extractDatesTimesLocations(text));

    if (!/magistrates'\s+court/gi.test(text)) {
      issues.push({
        description: "Jurisdictional prerequisite: Magistrates' Court reference not identified",
        severity: 'HIGH',
        line: 1,
        context: getContext(text, 0, Math.min(80, text.length))
      });
    }

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  function analyseContextual(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(before|after|during|at the time|meanwhile|subsequently)\b/gi,
        label: 'Temporal marker',
        severity: 'LOW'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(if|unless|provided that|subject to|in the event)\b/gi,
        label: 'Conditional statement',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(officer|informant|member|constable|prosecutor|defence)\b/gi,
        label: 'Authority reference',
        severity: 'LOW'
      })
    );

    const sequenceIssues = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      const label = `Sequence step ${index + 1}`;
      const startIndex = text.indexOf(trimmed);
      sequenceIssues.push({
        description: `${label}: ${trimmed.slice(0, 100)}`,
        severity: 'LOW',
        line: getLineNumber(text, startIndex),
        context: getContext(text, startIndex, trimmed.length)
      });
    });

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues: issues.concat(sequenceIssues)
    };
  }

  function analyseJurisprudential(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(common\s+law|precedent|ratio|obiter|authority\b)/gi,
        label: 'Common law reference',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(principle|test|standard|maxim)\b/gi,
        label: 'Legal principle',
        severity: 'MEDIUM'
      })
    );

    LATIN_MAXIMS.forEach(maxim => {
      const regex = new RegExp(maxim.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      issues.push(...registerMatches({ text, pattern: regex, label: 'Latin maxim', severity: 'LOW' }));
    });

    const precedentPattern = /(R\s*v\s*[A-Z][A-Za-z]+|\b\d{4}\b\s*(?:VSCA|VSC|HCA|VLR|VR))/g;
    issues.push(
      ...registerMatches({
        text,
        pattern: precedentPattern,
        label: 'Precedent citation',
        severity: 'HIGH'
      })
    );

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  function analyseObjective(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(mean|denote|refers? to|defined as)\b/gi,
        label: 'Plain meaning indicator',
        severity: 'LOW'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(ambiguous|unclear|vague|uncertain)\b/gi,
        label: 'Ambiguity flag',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(may|could|possible|approximately|about)\b/gi,
        label: 'Undefined or flexible term',
        severity: 'LOW'
      })
    );

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  function analyseSubjective(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(believed|suspected|formed the opinion|formed opinion|thought|considered)\b/gi,
        label: 'Stated intention',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(may have|possibly|appeared to|apparently|suggested)\b/gi,
        label: 'Qualifier',
        severity: 'LOW'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(stated that|asserted|contends?|claims?)\b/gi,
        label: 'Subjective statement',
        severity: 'MEDIUM'
      })
    );

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  function analysePurposive(doc) {
    const { text } = doc;
    const issues = [];
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(purpose|objective|intent|policy|aim|goal)\b/gi,
        label: 'Purpose reference',
        severity: 'LOW'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /\b(mischief|problem|defect|issue)\b/gi,
        label: 'Mischief reference',
        severity: 'MEDIUM'
      })
    );

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  function extractTemporalFacts(text) {
    return {
      dates: dedupe(
        (text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) || []).concat(
          text.match(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi) || []
        )
      ),
      times: dedupe(text.match(/\b\d{1,2}:\d{2}(?:\s?(?:AM|PM))?\b/gi) || []),
      locations: dedupe((text.match(/\b(?:at|in)\s+[A-Z][\w\s'-]{2,}\b/g) || []).map(item => item.trim()))
    };
  }

  function analyseComparative(documents) {
    const [docA, docB] = documents.slice(0, 2);
    if (!docA || !docB) {
      return {
        wordCount: documents.reduce((total, doc) => total + countWords(doc.text || ''), 0),
        lineCount: documents.reduce((total, doc) => total + splitLines(doc.text || '').length, 0),
        keyTerms: dedupe(documents.flatMap(doc => extractKeyLegalTerms(doc.text || ''))),
        statutoryReferences: dedupe(documents.flatMap(doc => extractStatutoryReferences(doc.text || ''))),
        issues: [
          {
            description: 'At least two documents are required for comparative analysis.',
            severity: 'MEDIUM',
            line: null,
            context: 'Provide Document A and Document B to enable cross-reference.'
          }
        ]
      };
    }

    const issues = [];

    const refsA = extractStatutoryReferences(docA.text);
    const refsB = extractStatutoryReferences(docB.text);
    const diffA = refsA.filter(ref => !refsB.includes(ref));
    const diffB = refsB.filter(ref => !refsA.includes(ref));
    diffA.forEach(ref => {
      const index = docA.text.toLowerCase().indexOf(ref.toLowerCase());
      issues.push({
        description: `Omission: Reference ${ref} only in Document A`,
        severity: 'MEDIUM',
        line: index >= 0 ? getLineNumber(docA.text, index) : null,
        context: index >= 0 ? getContext(docA.text, index, ref.length) : 'Document level omission'
      });
    });
    diffB.forEach(ref => {
      const index = docB.text.toLowerCase().indexOf(ref.toLowerCase());
      issues.push({
        description: `Omission: Reference ${ref} only in Document B`,
        severity: 'MEDIUM',
        line: index >= 0 ? getLineNumber(docB.text, index) : null,
        context: index >= 0 ? getContext(docB.text, index, ref.length) : 'Document level omission'
      });
    });

    const factsA = extractTemporalFacts(docA.text);
    const factsB = extractTemporalFacts(docB.text);

    factsA.dates.forEach(date => {
      if (!factsB.dates.includes(date)) {
        const index = docA.text.indexOf(date);
        issues.push({
          description: `Date inconsistency: ${date} missing in Document B`,
          severity: 'MEDIUM',
          line: index >= 0 ? getLineNumber(docA.text, index) : null,
          context: getContext(docA.text, index, date.length)
        });
      }
    });
    factsB.dates.forEach(date => {
      if (!factsA.dates.includes(date)) {
        const index = docB.text.indexOf(date);
        issues.push({
          description: `Date inconsistency: ${date} missing in Document A`,
          severity: 'MEDIUM',
          line: index >= 0 ? getLineNumber(docB.text, index) : null,
          context: getContext(docB.text, index, date.length)
        });
      }
    });

    factsA.times.forEach(time => {
      if (!factsB.times.includes(time)) {
        const index = docA.text.indexOf(time);
        issues.push({
          description: `Time inconsistency: ${time} only in Document A`,
          severity: 'MEDIUM',
          line: index >= 0 ? getLineNumber(docA.text, index) : null,
          context: getContext(docA.text, index, time.length)
        });
      }
    });
    factsB.times.forEach(time => {
      if (!factsA.times.includes(time)) {
        const index = docB.text.indexOf(time);
        issues.push({
          description: `Time inconsistency: ${time} only in Document B`,
          severity: 'MEDIUM',
          line: index >= 0 ? getLineNumber(docB.text, index) : null,
          context: getContext(docB.text, index, time.length)
        });
      }
    });

    const sentencesA = docA.text.split(/(?<=[.!?])\s+/);
    const sentencesB = docB.text.split(/(?<=[.!?])\s+/);
    const normalisedB = sentencesB.map(s => s.trim().toLowerCase());
    sentencesA.forEach(sentence => {
      const clean = sentence.trim();
      if (clean.length < 12) return;
      if (!normalisedB.includes(clean.toLowerCase())) {
        const index = docA.text.indexOf(clean);
        issues.push({
          description: 'Potential omission from Document B',
          severity: 'LOW',
          line: index >= 0 ? getLineNumber(docA.text, index) : null,
          context: getContext(docA.text, index, clean.length)
        });
      }
    });

    const normalisedA = sentencesA.map(s => s.trim().toLowerCase());
    sentencesB.forEach(sentence => {
      const clean = sentence.trim();
      if (clean.length < 12) return;
      if (!normalisedA.includes(clean.toLowerCase())) {
        const index = docB.text.indexOf(clean);
        issues.push({
          description: 'Potential omission from Document A',
          severity: 'LOW',
          line: index >= 0 ? getLineNumber(docB.text, index) : null,
          context: getContext(docB.text, index, clean.length)
        });
      }
    });

    return {
      wordCount: countWords(docA.text) + countWords(docB.text),
      lineCount: splitLines(docA.text).length + splitLines(docB.text).length,
      keyTerms: dedupe(extractKeyLegalTerms(docA.text).concat(extractKeyLegalTerms(docB.text))),
      statutoryReferences: dedupe(refsA.concat(refsB)),
      issues
    };
  }

  function analyseEvidentiary(doc) {
    const { text } = doc;
    const issues = [];

    const compliancePatterns = [
      { pattern: /section\s+49\s*\(1\)\s*\([a-h]\)/gi, label: 'Road Safety Act s.49(1)(a)-(h) reference' },
      { pattern: /section\s+55d/gi, label: 'Section 55D authority element' },
      { pattern: /section\s+55e/gi, label: 'Section 55E performance reference' },
      { pattern: /section\s+55\s*\(1\)/gi, label: 'Section 55(1) evidentiary requirement' }
    ];
    compliancePatterns.forEach(({ pattern, label }) => {
      issues.push(...registerMatches({ text, pattern, label, severity: 'MEDIUM' }));
    });

    issues.push(
      ...registerMatches({
        text,
        pattern: /section\s+137|section\s+138/gi,
        label: 'Evidence Act discretion reference',
        severity: 'MEDIUM'
      })
    );
    issues.push(
      ...registerMatches({
        text,
        pattern: /hearsay|business\s+records|section\s+69/gi,
        label: 'Hearsay or business records indicator',
        severity: 'HIGH'
      })
    );

    const lower = normaliseText(text);
    const requiredMentions = [
      'section 49(1)',
      'section 55d',
      'section 55e',
      'section 55(1)',
      'section 137',
      'section 138',
      'chapter 3'
    ];
    requiredMentions.forEach(mention => {
      if (!lower.includes(mention)) {
        issues.push({
          description: `Potential gap: ${mention} not identified`,
          severity: 'HIGH',
          line: 1,
          context: getContext(text, 0, Math.min(80, text.length))
        });
      }
    });

    return {
      wordCount: countWords(text),
      lineCount: splitLines(text).length,
      keyTerms: extractKeyLegalTerms(text),
      statutoryReferences: extractStatutoryReferences(text),
      issues
    };
  }

  const PRESETS = [
    { id: 1, title: 'Statutory Procedural Analysis', analyser: analyseStatutory },
    { id: 2, title: 'Contextual Analysis', analyser: analyseContextual },
    { id: 3, title: 'Jurisprudential Analysis', analyser: analyseJurisprudential },
    { id: 4, title: 'Objective Textual Analysis', analyser: analyseObjective },
    { id: 5, title: 'Subjective Intent Analysis', analyser: analyseSubjective },
    { id: 6, title: 'Purposive Analysis', analyser: analysePurposive },
    { id: 7, title: 'Comparative Cross-Reference', analyser: analyseComparative, multiDocument: true },
    { id: 8, title: 'Evidentiary Standards (Victorian specific)', analyser: analyseEvidentiary }
  ];

  function runPreset(presetId, documents) {
    const preset = PRESETS.find(item => item.id === presetId);
    if (!preset) {
      throw new Error(`Unknown preset: ${presetId}`);
    }

    if (preset.multiDocument) {
      return {
        presetId: preset.id,
        title: preset.title,
        results: [
          {
            documentLabel: 'Document A vs Document B',
            ...preset.analyser(documents)
          }
        ]
      };
    }

    return {
      presetId: preset.id,
      title: preset.title,
      results: documents.map((doc, index) => ({
        documentLabel: doc.name || `Document ${index + 1}`,
        ...preset.analyser(doc)
      }))
    };
  }

  function runAllPresets(documents) {
    return PRESETS.map(preset => runPreset(preset.id, documents));
  }

  return {
    LEGAL_FRAMEWORKS,
    KEY_LEGAL_TERMS,
    LATIN_MAXIMS,
    SAMPLE_DOCUMENTS,
    PRESETS,
    normaliseText,
    countWords,
    splitLines,
    getLineNumber,
    getContext,
    extractStatutoryReferences,
    extractKeyLegalTerms,
    analyseStatutory,
    analyseContextual,
    analyseJurisprudential,
    analyseObjective,
    analyseSubjective,
    analysePurposive,
    analyseComparative,
    analyseEvidentiary,
    runPreset,
    runAllPresets
  };
});
