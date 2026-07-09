update public.partners
set slug = 'word-on-fire',
    name = 'Word on Fire',
    description = 'Curated Night Prayer videos from Word on Fire for Ordinary Time, led by Bishop Robert Barron.',
    website = 'https://www.wordonfire.org/pray/',
    consent_notes = 'Public curated seed for the Word on Fire Night Prayer playlist led by Bishop Robert Barron. Import once; keep account pending while the source is reviewed.',
    community_page_slug = 'word-on-fire'
where slug = 'bishop-barron';
