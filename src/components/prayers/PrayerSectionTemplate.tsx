type PrayerSectionTemplateProps = {
  title: string;
  subtitle?: string;
  sections: string[];
};

function mockLinesForSection(section: string, index: number) {
  const normalized = section.toLowerCase();

  if (normalized.includes('hymn')) {
    return [
      'Mock hymn text rises in a gentle cadence with repeated praise and response.',
      'Placeholder verse line continues the melody pattern for spacing and rhythm.',
    ];
  }

  if (normalized.includes('psalm')) {
    return [
      'Mock psalm line reflects trust, gratitude, and petition in poetic parallel form.',
      'Placeholder antiphonal line echoes the refrain to preview responsive formatting.',
    ];
  }

  if (normalized.includes('reading')) {
    return [
      'Mock reading passage appears as prose blocks with measured cadence and pause.',
      'Placeholder continuation line extends the paragraph for realistic card height.',
    ];
  }

  if (normalized.includes('responsory') || normalized.includes('antiphon')) {
    return [
      'Mock response line appears in call-and-answer style for communal recitation.',
      'Placeholder refrain line repeats a short acclamation with matching structure.',
    ];
  }

  if (normalized.includes('prayer') || normalized.includes('dismissal')) {
    return [
      'Mock collect text petitions for mercy, guidance, and peace in concise form.',
      'Placeholder concluding line closes with a brief cadence suitable for liturgy.',
    ];
  }

  return [
    `Mock devotional line ${index + 1} is provided for structure and visual rhythm only.`,
    'Placeholder line maintains reading density while source text remains obscured.',
  ];
}

export function PrayerSectionTemplate({
  title,
  subtitle,
  sections,
}: PrayerSectionTemplateProps) {
  return (
    <div>
      {subtitle ? (
        <div className='liturgy-card-citation'>{subtitle}</div>
      ) : null}
      {sections.map((section, index) => (
        <section
          key={`${title}-${section}-${index}`}
          className={`liturgy-card${index % 2 === 1 ? ' alt' : ''}`}
        >
          <div className='liturgy-card-kicker'>Section {index + 1}</div>
          <h3 className='liturgy-card-title'>{section}</h3>
          <div className='mock-text-note'>
            Preview only — Official liturgical text pending licensing
          </div>
          <div
            className='liturgy-lines liturgy-lines-obscured'
            aria-label='Mock devotional text intentionally obscured'
          >
            <div className='liturgy-block liturgy-block-verse'>
              {mockLinesForSection(section, index).map((line) => (
                <p key={`${section}-${line}`} className='liturgy-line'>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
