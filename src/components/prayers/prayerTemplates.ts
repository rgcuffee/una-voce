type PrayerTemplate = {
    title: string;
    subtitle?: string;
    sections: string[];
};

export const officeOfReadings: PrayerTemplate = {
    title: 'Office of Readings',
    sections: [
        'Invitatory or Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm 1',
        'Antiphon',
        'Psalm 2',
        'Antiphon',
        'Psalm 3',
        'Antiphon',
        'Verse',
        'First Reading',
        'Responsory',
        'Second Reading',
        'Responsory',
        'Te Deum',
        'Concluding Prayer',
        'Dismissal',
    ],
};

export const morningPrayer: PrayerTemplate = {
    title: 'Morning Prayer',
    subtitle: 'Lauds',
    sections: [
        'Invitatory or Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Old Testament Canticle',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Short Reading',
        'Responsory',
        'Gospel Canticle',
        'Benedictus Antiphon',
        'Benedictus',
        'Intercessions',
        'The Lord\'s Prayer',
        'Concluding Prayer',
        'Blessing / Dismissal',
    ],
};

export const midmorningPrayer: PrayerTemplate = {
    title: 'Midmorning Prayer',
    subtitle: 'Terce',
    sections: [
        'Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Short Reading',
        'Verse',
        'Concluding Prayer',
        'Acclamation / Dismissal',
    ],
};

export const middayPrayer: PrayerTemplate = {
    title: 'Midday Prayer',
    subtitle: 'Sext',
    sections: [
        'Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Short Reading',
        'Verse',
        'Concluding Prayer',
        'Acclamation / Dismissal',
    ],
};

export const midafternoonPrayer: PrayerTemplate = {
    title: 'Midafternoon Prayer',
    subtitle: 'None',
    sections: [
        'Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'Short Reading',
        'Verse',
        'Concluding Prayer',
        'Acclamation / Dismissal',
    ],
};

export const eveningPrayer: PrayerTemplate = {
    title: 'Evening Prayer',
    subtitle: 'Vespers',
    sections: [
        'Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Psalm',
        'Antiphon',
        'New Testament Canticle',
        'Antiphon',
        'Short Reading',
        'Responsory',
        'Gospel Canticle',
        'Magnificat Antiphon',
        'Magnificat',
        'Intercessions',
        'The Lord\'s Prayer',
        'Concluding Prayer',
        'Blessing / Dismissal',
    ],
};

export const nightPrayer: PrayerTemplate = {
    title: 'Night Prayer',
    subtitle: 'Compline',
    sections: [
        'Examination of Conscience',
        'Opening Verse',
        'Hymn',
        'Psalmody',
        'Psalm',
        'Antiphon',
        'Short Reading',
        'Responsory',
        'Gospel Canticle',
        'Nunc Dimittis Antiphon',
        'Nunc Dimittis',
        'Concluding Prayer',
        'Blessing',
        'Marian Antiphon',
    ],
};
